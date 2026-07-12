"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, InputAdornment, Button, MessagePlugin, Select } from "tdesign-react";
import { LockOnIcon, UserIcon } from "tdesign-icons-react";
import type { SubmitContext } from "tdesign-react/es/form/type";
import { loginAction } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";

const { FormItem } = Form;
type LoginMode = "password" | "sms";

type SmsResponse = {
  success?: boolean;
  message?: string;
  requestId?: string;
  retryAfter?: number;
};

function normalizePhone(value: string) {
  return value.replace(/[\s()-]/g, "");
}

function assertValidPhone(phone: string) {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error("请输入 E.164 格式手机号，例如 +8613800138000");
  }
}

export function LoginForm() {
  const t = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("password");
  const [loading, setLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState("+86");
  const [smsPhone, setSmsPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [requestId, setRequestId] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const rules = {
    username: [{ required: true, message: t("login.requiredUsername"), type: "error" as const }],
    password: [{ required: true, message: t("login.requiredPassword"), type: "error" as const }],
  };

  const handleSubmit = useCallback(
    async (ctx: SubmitContext) => {
      if (ctx.validateResult !== true) return;
      const fields = ctx.fields as { username: string; password: string };
      const { username, password } = fields;
      console.log(`[login-form] 提交密码登录 | username="${username}"`);
      setLoading(true);
      try {
        const formData = new FormData();
        formData.set("username", username);
        formData.set("password", password);
        const result = await loginAction(formData);
        if (result.error) {
          MessagePlugin.error(result.error);
        } else {
          router.replace("/admin");
        }
      } catch {
        MessagePlugin.error(t("login.networkError"));
      } finally {
        setLoading(false);
      }
    },
    [router, t],
  );

  const sendSmsCode = useCallback(async () => {
    const phone = normalizePhone(`${phonePrefix}${smsPhone}`);
    try {
      assertValidPhone(phone);
      setSmsSending(true);
      const response = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" }),
      });
      const data = (await response.json()) as SmsResponse;
      if (!response.ok || !data.success || !data.requestId) {
        throw new Error(data.message || "验证码发送失败");
      }
      setRequestId(data.requestId);
      setCountdown(data.retryAfter || 60);
      MessagePlugin.success("验证码已发送，请查看服务端终端日志");
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : "验证码发送失败");
    } finally {
      setSmsSending(false);
    }
  }, [phonePrefix, smsPhone]);

  const verifySmsCode = useCallback(async () => {
    const phone = normalizePhone(`${phonePrefix}${smsPhone}`);
    try {
      assertValidPhone(phone);
      if (!requestId) throw new Error("请先获取验证码");
      if (!/^\d{6}$/.test(smsCode)) throw new Error("请输入 6 位验证码");
      setSmsLoading(true);
      const response = await fetch("/api/auth/sms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, phone, purpose: "login", code: smsCode }),
      });
      const data = (await response.json()) as SmsResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.message || "验证码登录失败");
      }
      router.replace("/admin");
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : "验证码登录失败");
    } finally {
      setSmsLoading(false);
    }
  }, [phonePrefix, requestId, router, smsCode, smsPhone]);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`rounded-lg px-3 py-2 transition-colors ${mode === "password" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          密码登录
        </button>
        <button
          type="button"
          onClick={() => setMode("sms")}
          className={`rounded-lg px-3 py-2 transition-colors ${mode === "sms" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          手机验证码
        </button>
      </div>

      {mode === "password" ? (
        <Form rules={rules} onSubmit={handleSubmit} labelAlign="top" resetType="initial">
          <FormItem label={t("login.username")} name="username">
            <Input
              prefixIcon={<UserIcon />}
              placeholder={t("login.usernamePlaceholder")}
              size="large"
              clearable
              autocomplete="username"
            />
          </FormItem>

          <FormItem label={t("login.password")} name="password">
            <Input
              prefixIcon={<LockOnIcon />}
              type="password"
              placeholder={t("login.passwordPlaceholder")}
              size="large"
              autocomplete="current-password"
            />
          </FormItem>

          <FormItem>
            <Button theme="primary" type="submit" block size="large" loading={loading}>
              {t("login.submit")}
            </Button>
          </FormItem>
        </Form>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">手机号</label>
            <InputAdornment
              prepend={
                <Select
                  autoWidth
                  value={phonePrefix}
                  onChange={(value) => setPhonePrefix(String(value))}
                  options={[{ label: "+86", value: "+86" }]}
                  size="large"
                  borderless
                />
              }
            >
              <Input
                value={smsPhone}
                onChange={(value) => setSmsPhone(String(value).replace(/\D/g, "").slice(0, 11))}
                placeholder="请输入 11 位手机号"
                size="large"
                clearable
                maxlength={11}
                autocomplete="tel-national"
              />
            </InputAdornment>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">验证码</label>
            <div className="flex gap-3">
              <Input
                value={smsCode}
                onChange={(value) => setSmsCode(String(value).replace(/\D/g, "").slice(0, 6))}
                placeholder="请输入 6 位验证码"
                size="large"
                maxlength={6}
                autocomplete="one-time-code"
              />
              <Button
                type="button"
                size="large"
                variant="outline"
                loading={smsSending}
                disabled={countdown > 0}
                onClick={sendSmsCode}
              >
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </Button>
            </div>
          </div>

          <Button theme="primary" type="button" block size="large" loading={smsLoading} onClick={verifySmsCode}>
            验证码登录
          </Button>
        </div>
      )}
    </div>
  );
}
