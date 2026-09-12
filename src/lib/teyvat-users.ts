import "server-only";
import { callTeyvatInternal, type InternalResult } from "@/lib/teyvat-internal";

/**
 * teyvat-guide 内网用户管理接口客户端。
 * 契约（由 teyvat-guide 主服务实现，统一信封 {code,message,data}）：
 *   GET  /internal/v1/admin/users?keyword=&page=&pageSize=
 *        data: { items: UserItem[], total, page, pageSize }
 *   POST /internal/v1/admin/users/status   body: { id, banned }
 *        data: null
 */

export type TeyvatUserItem = {
  id: number;
  username: string;
  displayName: string;
  genshinUid: string | null;
  status: "active" | "banned";
  createdAt: string;
  lastLoginAt: string | null;
  totalTokens: number;
};

export type UserPage = {
  items: TeyvatUserItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type { InternalResult };

export async function fetchUsers(params: { keyword?: string; page?: number; pageSize?: number }): Promise<InternalResult<UserPage>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 20));
  return callTeyvatInternal<UserPage>(`/internal/v1/admin/users?${query.toString()}`);
}

export async function setUserBanned(id: number, banned: boolean): Promise<InternalResult<null>> {
  return callTeyvatInternal<null>("/internal/v1/admin/users/status", {
    method: "POST",
    body: JSON.stringify({ id, banned }),
  });
}
