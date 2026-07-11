import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { MoreThan } from "typeorm";
import {
  PhoneVerificationCode,
  type PhoneVerificationPurpose,
  User,
} from "@/entities";
import { getDataSource } from "@/lib/db";
import { getSmsProvider } from "@/lib/sms";

const CODE_TTL_SECONDS = 300;
const RESEND_INTERVAL_SECONDS = 60;
const PHONE_HOURLY_LIMIT = 5;
const IP_HOURLY_LIMIT = 20;
const MAX_ATTEMPTS = 5;
const PURPOSES: PhoneVerificationPurpose[] = [
  "login",
  "bind_phone",
  "change_phone",
  "recover_account",
];

export class PhoneVerificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export function normalizePhone(value: string) {
  const phone = value.replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new PhoneVerificationError("请输入 E.164 格式手机号", "INVALID_PHONE");
  }
  return phone;
}

export function parsePurpose(value: unknown): PhoneVerificationPurpose {
  if (typeof value !== "string" || !PURPOSES.includes(value as PhoneVerificationPurpose)) {
    throw new PhoneVerificationError("无效的验证码用途", "INVALID_PURPOSE");
  }
  return value as PhoneVerificationPurpose;
}

function getSecret() {
  const secret = process.env.SMS_CODE_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SMS_CODE_HMAC_SECRET 必须设置为至少 32 个字符");
  }
  return secret;
}

function hashCode(requestId: string, phone: string, purpose: string, code: string) {
  return createHmac("sha256", getSecret())
    .update(`${requestId}:${phone}:${purpose}:${code}`)
    .digest("hex");
}

function hashIp(ip: string) {
  return createHmac("sha256", getSecret()).update(`ip:${ip}`).digest("hex");
}

function codesEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function sendPhoneVerificationCode(input: {
  phone: string;
  purpose: PhoneVerificationPurpose;
  ip: string;
}) {
  const phone = normalizePhone(input.phone);
  const ds = await getDataSource();
  const codeRepo = ds.getRepository(PhoneVerificationCode);
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - RESEND_INTERVAL_SECONDS * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const sentIpHash = hashIp(input.ip || "unknown");

  if (input.purpose === "login") {
    const user = await ds.getRepository(User).findOne({ where: { phone } });
    if (!user) {
      throw new PhoneVerificationError("该手机号未绑定账号", "PHONE_NOT_BOUND", 404);
    }
  }

  const recent = await codeRepo.findOne({
    where: { phone, purpose: input.purpose, createdAt: MoreThan(oneMinuteAgo) },
    order: { createdAt: "DESC" },
  });
  if (recent) {
    const retryAfter = Math.max(
      1,
      RESEND_INTERVAL_SECONDS - Math.floor((now.getTime() - recent.createdAt.getTime()) / 1000),
    );
    throw new PhoneVerificationError("请求过于频繁", "SEND_TOO_FREQUENT", 429, retryAfter);
  }

  const [phoneHourlyCount, ipHourlyCount] = await Promise.all([
    codeRepo.count({
      where: { phone, purpose: input.purpose, createdAt: MoreThan(oneHourAgo) },
    }),
    codeRepo.count({
      where: { sentIpHash, createdAt: MoreThan(oneHourAgo) },
    }),
  ]);
  if (phoneHourlyCount >= PHONE_HOURLY_LIMIT || ipHourlyCount >= IP_HOURLY_LIMIT) {
    throw new PhoneVerificationError("发送次数已达上限，请稍后再试", "SEND_LIMIT_REACHED", 429, 3600);
  }

  const requestId = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const record = codeRepo.create({
    requestId,
    phone,
    purpose: input.purpose,
    codeHash: hashCode(requestId, phone, input.purpose, code),
    expiresAt: new Date(now.getTime() + CODE_TTL_SECONDS * 1000),
    consumedAt: null,
    attemptCount: 0,
    maxAttempts: MAX_ATTEMPTS,
    sentIpHash,
  });
  await codeRepo.save(record);

  try {
    await getSmsProvider().sendVerificationCode({
      phone,
      code,
      expiresInMinutes: CODE_TTL_SECONDS / 60,
    });
  } catch (error) {
    await codeRepo.delete(record.id);
    throw error;
  }

  await codeRepo
    .createQueryBuilder()
    .update()
    .set({ consumedAt: now })
    .where("phone = :phone", { phone })
    .andWhere("purpose = :purpose", { purpose: input.purpose })
    .andWhere("consumed_at IS NULL")
    .andWhere("request_id <> :requestId", { requestId })
    .execute();

  return { requestId, expiresIn: CODE_TTL_SECONDS, retryAfter: RESEND_INTERVAL_SECONDS };
}

export async function verifyPhoneVerificationCode(input: {
  requestId: string;
  phone: string;
  purpose: PhoneVerificationPurpose;
  code: string;
}) {
  const phone = normalizePhone(input.phone);
  if (!/^\d{6}$/.test(input.code)) {
    throw new PhoneVerificationError("验证码格式不正确", "INVALID_CODE");
  }

  const ds = await getDataSource();
  const outcome = await ds.transaction(async (manager) => {
    const record = await manager
      .getRepository(PhoneVerificationCode)
      .createQueryBuilder("verification")
      .addSelect("verification.codeHash")
      .setLock("pessimistic_write")
      .where("verification.requestId = :requestId", { requestId: input.requestId })
      .getOne();

    if (!record || record.phone !== phone || record.purpose !== input.purpose) {
      throw new PhoneVerificationError("验证码无效", "VERIFICATION_NOT_FOUND");
    }
    if (record.consumedAt) {
      throw new PhoneVerificationError("验证码已使用", "CODE_CONSUMED");
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new PhoneVerificationError("验证码已过期", "CODE_EXPIRED");
    }
    if (record.attemptCount >= record.maxAttempts) {
      throw new PhoneVerificationError("验证次数已达上限", "ATTEMPTS_EXCEEDED", 429);
    }

    const submittedHash = hashCode(record.requestId, phone, record.purpose, input.code);
    if (!codesEqual(record.codeHash, submittedHash)) {
      record.attemptCount += 1;
      await manager.getRepository(PhoneVerificationCode).save(record);
      return { invalidCode: true as const };
    }

    record.consumedAt = new Date();
    await manager.getRepository(PhoneVerificationCode).save(record);

    const user = await manager.getRepository(User).findOne({ where: { phone } });
    if (input.purpose === "login" && !user) {
      throw new PhoneVerificationError("该手机号未绑定账号", "PHONE_NOT_BOUND", 404);
    }

    return {
      invalidCode: false as const,
      verified: true as const,
      user: user
        ? { id: user.id, username: user.username, permissionLevel: user.permissionLevel }
        : null,
    };
  });

  if (outcome.invalidCode) {
    throw new PhoneVerificationError("验证码错误", "INVALID_CODE");
  }
  return outcome;
}
