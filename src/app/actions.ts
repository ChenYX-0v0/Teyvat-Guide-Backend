"use server";

import { verifyUser } from "@/lib/auth";
import { translate as t } from "@/lib/i18n";

export async function loginAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  console.log(
    `[login] 收到登录请求 | 用户名="${username}" | 密码长度=${password.length} | 时间=${new Date().toISOString()}`,
  );

  try {
    console.log(`[login] 开始校验用户 "${username}" ...`);
    const user = await verifyUser(username, password);

    if (user) {
      console.log(
        `[login] ✅ 登录成功 | username="${user.username}" id=${user.id} permissionLevel=${user.permissionLevel}`,
      );
      return {};
    }
  } catch (err) {
    console.error(`[login] ❌ 系统异常:`, err);
    return { error: t("login.serverBusy") };
  }

  console.warn(`[login] ❌ 密码错误 | username="${username}"`);
  return { error: t("login.invalidCredentials") };
}
