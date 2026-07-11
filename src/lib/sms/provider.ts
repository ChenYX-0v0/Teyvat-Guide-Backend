export type SendVerificationCodeInput = {
  phone: string;
  code: string;
  expiresInMinutes: number;
};

export type SendVerificationCodeResult = {
  providerMessageId?: string;
};

export interface SmsProvider {
  sendVerificationCode(
    input: SendVerificationCodeInput,
  ): Promise<SendVerificationCodeResult>;
}
