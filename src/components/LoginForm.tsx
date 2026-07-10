"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, MessagePlugin, Divider } from "tdesign-react";
import { LockOnIcon, UserIcon } from "tdesign-icons-react";
import type { SubmitContext } from "tdesign-react/es/form/type";
import { loginAction } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";

const { FormItem } = Form;

export function LoginForm() {
  const t = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const rules = {
    username: [{ required: true, message: t("login.requiredUsername"), type: "error" as const }],
    password: [{ required: true, message: t("login.requiredPassword"), type: "error" as const }],
  };

  const handleSubmit = useCallback(
    async (ctx: SubmitContext) => {
      if (ctx.validateResult !== true) return;
      const fields = ctx.fields as { username: string; password: string };
      const { username, password } = fields;
      console.log(`[login-form] 提交表单 | username="${username}"`);
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

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-900">{t("login.welcome")}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t("login.description")}</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
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

        <Divider />

        <p className="text-center text-xs text-zinc-400">{t("login.helper")}</p>
      </div>
    </div>
  );
}
