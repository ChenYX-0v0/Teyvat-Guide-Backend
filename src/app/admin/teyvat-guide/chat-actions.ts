"use server";

import { requireAdmin } from "@/lib/session";
import { fetchChatSessions, fetchChatMessages, type ChatMessageItem, type ChatSessionItem } from "@/lib/teyvat-chats";

export type ChatSessionRow = ChatSessionItem;
export type ChatMessageRow = ChatMessageItem;

/** 会话列表查询条件（各字段都可选；from/to 为 RFC3339） */
export type ChatSessionQuery = {
  keyword?: string;
  userId?: number;
  from?: string;
  to?: string;
  onlyDegraded?: boolean;
  onlyDeleted?: boolean;
  page?: number;
  pageSize?: number;
};

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

export type ChatSessionExportResult = {
  success: boolean;
  message: string;
  notReady: boolean;
  csv: string;
  count: number;
  /** 结果被上限截断时为 true（前端提示"请缩小范围"） */
  truncated: boolean;
};

export async function listChatSessionsAction(params: ChatSessionQuery): Promise<ChatSessionListResult> {
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

// 导出上限：内网接口 pageSize 上限 100，页数封顶避免把大库一次拉爆
const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_ROWS = 1000;

/**
 * 导出会话列表 CSV（按当前筛选条件分页取全）。
 * 说明：只导出**列表级**字段（不含消息正文）——正文体积大且含用户内容，需要时点开单条会话查看。
 */
export async function exportChatSessionsAction(params: ChatSessionQuery): Promise<ChatSessionExportResult> {
  await requireAdmin();

  const rows: ChatSessionRow[] = [];
  let page = 1;
  let total = 0;
  for (;;) {
    const result = await fetchChatSessions({ ...params, page, pageSize: EXPORT_PAGE_SIZE });
    if (!result.success || !result.data) {
      return { success: false, message: result.message, notReady: result.notReady, csv: "", count: 0, truncated: false };
    }
    total = result.data.total;
    rows.push(...result.data.items);
    if (rows.length >= total || result.data.items.length === 0) break;
    if (rows.length >= EXPORT_MAX_ROWS) break;
    page += 1;
  }

  const truncated = rows.length < total;
  return {
    success: true,
    message: "ok",
    notReady: false,
    csv: buildSessionCSV(rows, truncated),
    count: rows.length,
    truncated,
  };
}

const CSV_HEADER = [
  "会话ID",
  "标题",
  "归属",
  "用户ID",
  "用户名",
  "昵称",
  "游戏UID",
  "轮次",
  "Token",
  "降级数",
  "上下文",
  "最近提问",
  "创建时间",
  "最近活跃",
  "用户删除时间",
];

/** 生成 CSV 文本：带 UTF-8 BOM（Excel 直接打开不乱码），字段按 CSV 规则转义 */
function buildSessionCSV(rows: ChatSessionRow[], truncated: boolean): string {
  const lines: string[][] = [CSV_HEADER];
  for (const row of rows) {
    lines.push([
      row.sessionId,
      row.title,
      row.userId ? "登录用户" : "匿名",
      row.userId ? String(row.userId) : "",
      row.username ?? "",
      row.displayName ?? "",
      row.genshinUid ?? "",
      String(row.messageCount),
      String(row.tokens),
      String(row.degradedCount),
      [row.hasPlayerContext ? "面板" : "", row.hasAssetReference ? "资料" : ""].filter(Boolean).join("/"),
      row.lastQuestion ?? "",
      row.createdAt,
      row.updatedAt,
      row.deletedAt ?? "",
    ]);
  }
  if (truncated) {
    lines.push([`（结果超过 ${EXPORT_MAX_ROWS} 行已截断，请缩小时间范围后重新导出）`]);
  }
  return "\uFEFF" + lines.map((cols) => cols.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value: string): string {
  const text = value ?? "";
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
