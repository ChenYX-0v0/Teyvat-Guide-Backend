"use server";

import { requireAdmin } from "@/lib/session";
import {
  createUser,
  fetchUsers,
  setUserBanned,
  type CreateUserInput,
  type TeyvatCreatedUser,
  type TeyvatUserItem,
  type UserQuery,
} from "@/lib/teyvat-users";

export type UserRow = TeyvatUserItem;
export type CreateUserPayload = CreateUserInput;
export type CreatedUserRow = TeyvatCreatedUser;

export type CreateUserResult = {
  success: boolean;
  message: string;
  item: CreatedUserRow | null;
};

export type UserListResult = {
  success: boolean;
  message: string;
  notReady: boolean;
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listUsersAction(params: UserQuery): Promise<UserListResult> {
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

/** 新增账号（邀请制下的唯一开户入口；用户名重复会由主服务返回 409 文案） */
export async function createUserAction(input: CreateUserPayload): Promise<CreateUserResult> {
  await requireAdmin();
  const result = await createUser(input);
  if (!result.success || !result.data) {
    return { success: false, message: result.message, item: null };
  }
  return { success: true, message: "ok", item: result.data };
}
