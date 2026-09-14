import "server-only";
import { callTeyvatInternal, type InternalResult } from "@/lib/teyvat-internal";

/**
 * teyvat-guide 内网用户管理接口客户端。
 * 契约（由 teyvat-guide 主服务实现，统一信封 {code,message,data}）：
 *   GET  /internal/v1/admin/users?keyword=&usageDate=&minDailyTokens=&onlyOffTopic=&offTopicMin=&page=&pageSize=
 *        data: { items: UserItem[], total, page, pageSize }
 *   POST /internal/v1/admin/users/status   body: { id, banned }
 *        data: null
 *
 * 用量与无关问题相关字段/参数为 2026-09-14 新增（设计见 shared-docs/05-AI使用边界设计（匿名·配额·内容治理）.md）：
 *   - 当日用量（`todayTokens` 等）用于「5 万观察线」，**观察线不是拦截线**（拦截线是 10 万，在主服务侧强制）；
 *   - `onlyOffTopic` 只返回有无关提问的用户（判定未开启时是空集）。
 */

// 注意：本模块是 **server-only**，Client Component 只能 `import type` 它的类型。
// 「5 万观察线」是运行时值，放在中性模块 `@/lib/teyvat/constants` 里（客户端也要用）。
// 曾因为从本文件 import 该常量导致 Turbopack 构建报 server-only，别再放回来。

export type TeyvatUserItem = {
  id: number;
  username: string;
  displayName: string;
  genshinUid: string | null;
  status: "active" | "banned";
  createdAt: string;
  lastLoginAt: string | null;
  totalTokens: number;
  /** 当日用量（usageDate 指定，默认今天，本地时区） */
  todayTokens: number;
  todayInput: number;
  todayOutput: number;
  /** 缓存命中部分单独给：单价约为未命中的 1/50，成本折算要分开算 */
  todayCached: number;
  todayRequests: number;
  /** 累计无关提问数（`role='user' AND off_topic=1`）；判定未开启时为 0 */
  offTopicCount: number;
};

export type UserPage = {
  items: TeyvatUserItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type UserQuery = {
  keyword?: string;
  /** 用量统计日期（yyyy-MM-dd，本地时区）；缺省 = 今天 */
  usageDate?: string;
  /** 只返回当日消耗 ≥ 该值的用户（5 万观察线传 DAILY_TOKEN_WATCH_THRESHOLD） */
  minDailyTokens?: number;
  /** 只返回有无关提问的用户 */
  onlyOffTopic?: boolean;
  /** 无关提问数 ≥ N（与 onlyOffTopic 同时传则取交集） */
  offTopicMin?: number;
  page?: number;
  pageSize?: number;
};

export type { InternalResult };

export async function fetchUsers(params: UserQuery): Promise<InternalResult<UserPage>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.usageDate) query.set("usageDate", params.usageDate);
  if (params.minDailyTokens) query.set("minDailyTokens", String(params.minDailyTokens));
  if (params.onlyOffTopic) query.set("onlyOffTopic", "true");
  if (params.offTopicMin) query.set("offTopicMin", String(params.offTopicMin));
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
