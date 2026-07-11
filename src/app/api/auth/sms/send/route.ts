import { NextResponse } from "next/server";
import {
  parsePurpose,
  PhoneVerificationError,
  sendPhoneVerificationCode,
} from "@/lib/phone-verification";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: unknown; purpose?: unknown };
    if (typeof body.phone !== "string") {
      throw new PhoneVerificationError("手机号不能为空", "INVALID_PHONE");
    }

    const result = await sendPhoneVerificationCode({
      phone: body.phone,
      purpose: parsePurpose(body.purpose),
      ip: clientIp(request),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof PhoneVerificationError) {
      const response = NextResponse.json(
        { success: false, code: error.code, message: error.message, retryAfter: error.retryAfter },
        { status: error.status },
      );
      if (error.retryAfter) response.headers.set("Retry-After", String(error.retryAfter));
      return response;
    }
    console.error("[sms] 发送验证码失败", error);
    return NextResponse.json(
      { success: false, code: "SEND_FAILED", message: "验证码发送失败" },
      { status: 500 },
    );
  }
}
