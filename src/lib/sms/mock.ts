import { randomUUID } from "node:crypto";
import type { SmsProvider } from "./provider";

function maskPhone(phone: string) {
  return phone.length > 7
    ? `${phone.slice(0, 4)}****${phone.slice(-4)}`
    : "****";
}

export const mockSmsProvider: SmsProvider = {
  async sendVerificationCode({ phone, code, expiresInMinutes }) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("生产环境禁止使用 Mock 短信供应商");
    }

    const providerMessageId = `mock-${randomUUID()}`;
    console.info(
      `[sms:mock] phone=${maskPhone(phone)} code=${code} expires=${expiresInMinutes}m messageId=${providerMessageId}`,
    );
    return { providerMessageId };
  },
};
