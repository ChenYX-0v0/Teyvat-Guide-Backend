import type { SmsProvider } from "./provider";
import { mockSmsProvider } from "./mock";

export type { SmsProvider } from "./provider";

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER || "mock";

  if (provider === "mock") {
    return mockSmsProvider;
  }

  throw new Error(`不支持的短信供应商：${provider}`);
}
