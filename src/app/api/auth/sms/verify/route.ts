import { NextResponse } from "next/server";
import {
  parsePurpose,
  PhoneVerificationError,
  verifyPhoneVerificationCode,
} from "@/lib/phone-verification";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      requestId?: unknown;
      phone?: unknown;
      purpose?: unknown;
      code?: unknown;
    };
    if (typeof body.requestId !== "string" || !body.requestId) {
      throw new PhoneVerificationError("验证码请求 ID 不能为空", "INVALID_REQUEST_ID");
    }
    if (typeof body.phone !== "string" || typeof body.code !== "string") {
      throw new PhoneVerificationError("手机号和验证码不能为空", "INVALID_INPUT");
    }

    const purpose = parsePurpose(body.purpose);
    const result = await verifyPhoneVerificationCode({
      requestId: body.requestId,
      phone: body.phone,
      purpose,
      code: body.code,
    });
    if (purpose === "login") {
      if (!result.user || result.user.permissionLevel !== 0) {
        throw new PhoneVerificationError("当前账号没有管理员后台访问权限", "FORBIDDEN", 403);
      }
      await createSession(result.user.id);
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof PhoneVerificationError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error("[sms] 验证验证码失败", error);
    return NextResponse.json(
      { success: false, code: "VERIFY_FAILED", message: "验证码验证失败" },
      { status: 500 },
    );
  }
}
