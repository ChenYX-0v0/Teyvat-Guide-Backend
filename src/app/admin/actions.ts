"use server";

import { createUser, changePassword, setPermissionLevel, deleteUser } from "@/lib/auth";
import { translate as t } from "@/lib/i18n";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: FormData): Promise<{ error?: string }> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const permissionLevel = Number(formData.get("permissionLevel") ?? 1);

  console.log(`[admin] createUser 开始 | username="${username}" permissionLevel=${permissionLevel} | 时间=${new Date().toISOString()}`);
  try {
    await createUser(username, password, permissionLevel);
    console.log(`[admin] createUser ✅ 成功 | username="${username}"`);
    revalidatePath("/admin");
    return {};
  } catch (err: any) {
    console.error(`[admin] createUser ❌ 失败 | username="${username}"`, err);
    return { error: err.message ?? t("admin.createFailed") };
  }
}

export async function changePasswordAction(formData: FormData): Promise<{ error?: string }> {
  const username = String(formData.get("username") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "").trim();

  console.log(`[admin] changePassword 开始 | username="${username}" | 时间=${new Date().toISOString()}`);
  try {
    await changePassword(username, newPassword);
    console.log(`[admin] changePassword ✅ 成功 | username="${username}"`);
    revalidatePath("/admin");
    return {};
  } catch (err: any) {
    console.error(`[admin] changePassword ❌ 失败 | username="${username}"`, err);
    return { error: err.message ?? "修改失败" };
  }
}

export async function setPermissionAction(formData: FormData): Promise<{ error?: string }> {
  const username = String(formData.get("username") ?? "").trim();
  const level = Number(formData.get("level") ?? 1);

  console.log(`[admin] setPermission 开始 | username="${username}" level=${level} | 时间=${new Date().toISOString()}`);
  try {
    await setPermissionLevel(username, level);
    console.log(`[admin] setPermission ✅ 成功 | username="${username}" level=${level}`);
    revalidatePath("/admin");
    return {};
  } catch (err: any) {
    console.error(`[admin] setPermission ❌ 失败 | username="${username}"`, err);
    return { error: err.message ?? t("admin.permissionFailed") };
  }
}

export async function deleteUserAction(formData: FormData): Promise<{ error?: string }> {
  const username = String(formData.get("username") ?? "").trim();

  console.log(`[admin] deleteUser 开始 | username="${username}" | 时间=${new Date().toISOString()}`);
  try {
    await deleteUser(username);
    console.log(`[admin] deleteUser ✅ 成功 | username="${username}"`);
    revalidatePath("/admin");
    return {};
  } catch (err: any) {
    console.error(`[admin] deleteUser ❌ 失败 | username="${username}"`, err);
    return { error: err.message ?? t("admin.deleteFailed") };
  }
}
