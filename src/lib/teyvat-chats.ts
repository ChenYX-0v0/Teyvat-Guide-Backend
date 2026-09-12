import "server-only";
import { callTeyvatInternal, type InternalResult } from "@/lib/teyvat-internal";

/**
 * teyvat-guide 内网对话记录接口客户端（只读）。
 * 契约（设计见 docs/06-对话记录查看设计.md §4）：
 *   GET /internal/v1/admin/chat/sessions?keyword=&userId=&uid=&onlyDegraded=&from=&to=&page=&pageSize=
 *       data: { items: ChatSessionItem[], total, page, pageSize }
 *   GET /internal/v1/admin/chat/sessions/{sessionId}/messages?afterId=&limit=
 *       data: { sessionId, userId, messages: ChatMessageItem[], hasMore }
 *
 * 口径提醒：keyword **只匹配提问内容**（不搜回答），这是既定设计，不是 bug。
 */

export type ChatSessionItem = {
  sessionId: string;
  title: string;
  /** 0 = 匿名会话 */
  userId: number;
  username: string | null;
  displayName: string | null;
  genshinUid: string | null;
  messageCount: number;
  tokens: number;
  degradedCount: number;
  hasPlayerContext: boolean;
  hasAssetReference: boolean;
  lastQuestion: string | null;
  createdAt: string;
  updatedAt: string;
  /** 用户在 C 端删除会话的时间；null = 未删除（软删除：后台仍可见，仅标注） */
  deletedAt: string | null;
};

export type ChatSessionPage = {
  items: ChatSessionItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ChatMessageItem = {
  id: number;
  role: "user" | "assistant" | string;
  content: string;
  tokens: number;
  tokensInput: number;
  tokensOutput: number;
  tokensCached: number;
  model: string;
  profile: string;
  degraded: boolean;
  elapsedMs: number;
  createdAt: string;
};

export type ChatMessages = {
  sessionId: string;
  userId: number;
  messages: ChatMessageItem[];
  hasMore: boolean;
};

export async function fetchChatSessions(params: {
  keyword?: string;
  userId?: number;
  onlyDegraded?: boolean;
  onlyDeleted?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<InternalResult<ChatSessionPage>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.userId) query.set("userId", String(params.userId));
  if (params.onlyDegraded) query.set("onlyDegraded", "true");
  if (params.onlyDeleted) query.set("onlyDeleted", "true");
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 20));
  return callTeyvatInternal<ChatSessionPage>(`/internal/v1/admin/chat/sessions?${query.toString()}`);
}

export async function fetchChatMessages(sessionId: string, afterId = 0): Promise<InternalResult<ChatMessages>> {
  const query = new URLSearchParams();
  if (afterId > 0) query.set("afterId", String(afterId));
  return callTeyvatInternal<ChatMessages>(
    `/internal/v1/admin/chat/sessions/${encodeURIComponent(sessionId)}/messages?${query.toString()}`,
  );
}
