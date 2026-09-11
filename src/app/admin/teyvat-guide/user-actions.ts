"use server";

import { requireAdmin } from "@/lib/session";
import { fetchUsers, setUserBanned, type TeyvatUserItem } from "@/lib/teyvat-users";

export type UserRow = TeyvatUserItem;

export type UserListResult = {
  success: boolean;
  message: string;
  notReady: boolean;
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listUsersAction(params: { keyword?: string; page?: number; pageSize?: number }): Promise<UserListResult> {
  await requireAdmin();
  const result = await fetchUsers(params);
  if (!result.success || !result.data) {
    return { success: false, message: result.message, notReady: result.notReady, items: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 20 };
  }
  return {
    success: true,
    message: "ok",
    notReady: false,
    items: result.data.items,
    total: result.data.total,
    page: result.data.page,
    pageSize: result.data.pageSize,
  };
}

export async function setUserBannedAction(id: number, banned: boolean): Promise<{ success: boolean; message: string }> {
  await requireAdmin();
  const result = await setUserBanned(id, banned);
  return { success: result.success, message: result.message };
}
