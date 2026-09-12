"use server";

import { requireAdmin } from "@/lib/session";
import { fetchChatMessages, fetchChatSessions, type ChatMessageItem, type ChatSessionItem } from "@/lib/teyvat-chats";

export type ChatSessionRow = ChatSessionItem;
export type ChatMessageRow = ChatMessageItem;

export type ChatSessionListResult = {
  success: boolean;
  message: string;
  notReady: boolean;
  items: ChatSessionRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type ChatMessagesResult = {
  success: boolean;
  message: string;
  notReady: boolean;
  sessionId: string;
  userId: number;
  messages: ChatMessageRow[];
  hasMore: boolean;
};

export async function listChatSessionsAction(params: {
  keyword?: string;
  userId?: number;
  onlyDegraded?: boolean;
  onlyDeleted?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ChatSessionListResult> {
  await requireAdmin();
  const result = await fetchChatSessions(params);
  if (!result.success || !result.data) {
    return {
      success: false,
      message: result.message,
      notReady: result.notReady,
      items: [],
      total: 0,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    };
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

export async function getChatMessagesAction(sessionId: string, afterId = 0): Promise<ChatMessagesResult> {
  await requireAdmin();
  const result = await fetchChatMessages(sessionId, afterId);
  if (!result.success || !result.data) {
    return {
      success: false,
      message: result.message,
      notReady: result.notReady,
      sessionId,
      userId: 0,
      messages: [],
      hasMore: false,
    };
  }
  return {
    success: true,
    message: "ok",
    notReady: false,
    sessionId: result.data.sessionId,
    userId: result.data.userId,
    messages: result.data.messages,
    hasMore: result.data.hasMore,
  };
}
