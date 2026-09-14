"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, DateRangePicker, Drawer, Input, MessagePlugin, Switch, Table, Tag } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { formatLocalTime } from "@/lib/format";
import {
  exportChatSessionsAction,
  getChatMessagesAction,
  listChatSessionsAction,
  type ChatMessageRow,
  type ChatSessionRow,
} from "./chat-actions";

const PAGE_SIZE = 20;

/** 筛选条件（range 为本地日期 yyyy-MM-dd，提交前转成 RFC3339） */
type Filters = {
  keyword: string;
  userId?: number;
  range: string[];
  onlyDegraded: boolean;
  onlyDeleted: boolean;
  /** 只看含无关提问的会话（2026-09-14 新增） */
  onlyOffTopic: boolean;
};

const EMPTY_FILTERS: Filters = {
  keyword: "",
  userId: undefined,
  range: [],
  onlyDegraded: false,
  onlyDeleted: false,
  onlyOffTopic: false,
};

/** 无关问题子类的展示名（`offTopic = null` 表示未判定，不显示 Tag） */
const OFF_TOPIC_REASONS: Record<string, string> = {
  chitchat: "闲聊",
  other_domain: "其他领域",
  injection: "越狱尝试",
  unclear: "无法归类",
  game: "与游戏相关",
};

function ownerText(row: ChatSessionRow) {
  if (!row.userId) return "—";
  const name = row.displayName || row.username || `#${row.userId}`;
  return row.genshinUid ? `${name}（${row.genshinUid}）` : name;
}

function dayOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 日期选择器的值 → 本地日期字符串数组 */
function toDayRange(value: Array<string | Date> | undefined): string[] {
  if (!value || value.length === 0) return [];
  return value.map((item) => (typeof item === "string" ? item.slice(0, 10) : dayOf(item)));
}

/** 本地日 → RFC3339；用 toISOString 自动带上正确的时区偏移 */
function dayStart(day?: string): string | undefined {
  return day ? new Date(`${day}T00:00:00`).toISOString() : undefined;
}

function dayEnd(day?: string): string | undefined {
  return day ? new Date(`${day}T23:59:59`).toISOString() : undefined;
}

function exportStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** 触发浏览器下载（CSV 由 Server Action 生成，密钥与用户数据都不经过浏览器请求） */
function downloadCSV(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type Props = {
  /** 从「用户管理 → 查看对话」跳转过来时带上用户 ID（外层用 key 保证切换时重新加载） */
  initialUserId?: number;
};

export function ChatLogPanel({ initialUserId }: Props) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, userId: initialUserId });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ChatSessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [notReadyMessage, setNotReadyMessage] = useState("");

  const [detail, setDetail] = useState<ChatSessionRow | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (targetPage: number, f: Filters) => {
    setLoading(true);
    setNotReadyMessage("");
    try {
      const result = await listChatSessionsAction({
        keyword: f.keyword,
        userId: f.userId,
        from: dayStart(f.range[0]),
        to: dayEnd(f.range[1]),
        onlyDegraded: f.onlyDegraded,
        onlyDeleted: f.onlyDeleted,
        onlyOffTopic: f.onlyOffTopic,
        page: targetPage,
        pageSize: PAGE_SIZE,
      });
      if (!result.success) {
        setRows([]);
        setTotal(0);
        if (result.notReady) setNotReadyMessage(result.message);
        else MessagePlugin.error(result.message);
        return;
      }
      setRows(result.items);
      setTotal(result.total);
      setPage(result.page);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1, { ...EMPTY_FILTERS, userId: initialUserId });
  }, [load, initialUserId]);

  const applyFilters = useCallback(
    (next: Filters) => {
      setFilters(next);
      setPage(1);
      void load(1, next);
    },
    [load],
  );

  const handleSearch = useCallback(() => applyFilters(filters), [applyFilters, filters]);

  const handleReset = useCallback(() => applyFilters(EMPTY_FILTERS), [applyFilters]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportChatSessionsAction({
        keyword: filters.keyword,
        userId: filters.userId,
        from: dayStart(filters.range[0]),
        to: dayEnd(filters.range[1]),
        onlyDegraded: filters.onlyDegraded,
        onlyDeleted: filters.onlyDeleted,
        onlyOffTopic: filters.onlyOffTopic,
      });
      if (!result.success) {
        if (result.notReady) setNotReadyMessage(result.message);
        else MessagePlugin.error(result.message);
        return;
      }
      downloadCSV(result.csv, `chat-sessions-${exportStamp()}.csv`);
      MessagePlugin.success(
        result.truncated ? `已导出 ${result.count} 条（超出上限已截断，请缩小时间范围）` : `已导出 ${result.count} 条`,
      );
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const openDetail = useCallback(async (row: ChatSessionRow) => {
    setDetail(row);
    setMessages([]);
    setHasMore(false);
    setMessagesLoading(true);
    try {
      const result = await getChatMessagesAction(row.sessionId);
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      setMessages(result.messages);
      setHasMore(result.hasMore);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!detail || messages.length === 0) return;
    setMessagesLoading(true);
    try {
      const lastId = messages[messages.length - 1].id;
      const result = await getChatMessagesAction(detail.sessionId, lastId);
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      setMessages((prev) => [...prev, ...result.messages]);
      setHasMore(result.hasMore);
    } finally {
      setMessagesLoading(false);
    }
  }, [detail, messages]);

  const columns: PrimaryTableCol<ChatSessionRow>[] = [
    {
      colKey: "title",
      title: "会话",
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-slate-800">{row.title || "（无标题）"}</p>
            {row.deletedAt && (
              <Tag theme="warning" variant="light" size="small">
                已删除
              </Tag>
            )}
            {(row.offTopicCount ?? 0) > 0 && (
              <Tag theme="danger" variant="light" size="small">
                无关 {row.offTopicCount}
              </Tag>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-400">{row.lastQuestion || "—"}</p>
        </div>
      ),
    },
    {
      colKey: "userId",
      title: "归属",
      width: 190,
      cell: ({ row }) =>
        row.userId ? (
          <span className="text-slate-700">{ownerText(row)}</span>
        ) : (
          <Tag theme="default" variant="light">
            匿名
          </Tag>
        ),
    },
    { colKey: "messageCount", title: "轮次", width: 80 },
    { colKey: "tokens", title: "Token", width: 90 },
    {
      colKey: "degradedCount",
      title: "降级",
      width: 80,
      cell: ({ row }) =>
        row.degradedCount > 0 ? (
          <Tag theme="danger" variant="light">
            {row.degradedCount}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      colKey: "context",
      title: "上下文",
      width: 150,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.hasPlayerContext && (
            <Tag theme="primary" variant="light" size="small">
              面板
            </Tag>
          )}
          {row.hasAssetReference && (
            <Tag theme="success" variant="light" size="small">
              资料
            </Tag>
          )}
          {!row.hasPlayerContext && !row.hasAssetReference && "—"}
        </div>
      ),
    },
    { colKey: "updatedAt", title: "最近活跃", width: 180, cell: ({ row }) => formatLocalTime(row.updatedAt) },
    {
      colKey: "actions",
      title: "操作",
      width: 90,
      cell: ({ row }) => (
        <Button size="small" variant="text" theme="primary" onClick={() => openDetail(row)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">对话记录</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              经内网接口读取 web 服务器（teyvat-guide）的会话与消息，只读；浏览器不接触内网密钥与用户数据。
              用户在 C 端删除的会话仍会列出并标注「已删除」（软删除，数据保留），后台不提供删除入口。
              「仅看无关提问」按判定为与游戏无关的**提问**筛选（判定未开启时为空集；未判定的消息不显示标记）。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={filters.keyword}
              onChange={(value) => setFilters((f) => ({ ...f, keyword: String(value) }))}
              placeholder="搜索提问内容（不含回答）"
              clearable
              style={{ width: 240 }}
              onEnter={handleSearch}
            />
            <DateRangePicker
              value={filters.range}
              onChange={(value) => setFilters((f) => ({ ...f, range: toDayRange(value as Array<string | Date>) }))}
              clearable
              style={{ width: 240 }}
              placeholder={["开始日期", "结束日期"]}
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Switch
                value={filters.onlyDegraded}
                onChange={(value) => setFilters((f) => ({ ...f, onlyDegraded: Boolean(value) }))}
              />
              仅看降级
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Switch
                value={filters.onlyDeleted}
                onChange={(value) => setFilters((f) => ({ ...f, onlyDeleted: Boolean(value) }))}
              />
              仅看已删除
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Switch
                value={filters.onlyOffTopic}
                onChange={(value) => setFilters((f) => ({ ...f, onlyOffTopic: Boolean(value) }))}
              />
              仅看无关提问
            </label>
            <Button theme="primary" loading={loading} onClick={handleSearch}>
              查询
            </Button>
            <Button variant="outline" onClick={handleReset}>
              重置
            </Button>
            <Button variant="outline" loading={exporting} onClick={() => void handleExport()}>
              导出 CSV
            </Button>
          </div>
        </div>

        {filters.userId !== undefined && (
          <div className="mb-3">
            <Tag
              theme="primary"
              variant="light"
              closable
              onClose={() => applyFilters({ ...filters, userId: undefined })}
            >
              仅看用户 #{filters.userId}（来自用户管理）
            </Tag>
          </div>
        )}

        {notReadyMessage && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            接口未就绪：{notReadyMessage}
            <span className="mt-1 block text-xs text-amber-600">
              需在 teyvat-guide 主服务提供 <code>GET /internal/v1/admin/chat/sessions</code> 与{" "}
              <code>/chat/sessions/&#123;sessionId&#125;/messages</code>（<code>X-Internal-Key</code> 鉴权），
              并配置本系统 <code>PROJECT_TEYVAT_GUIDE_INTERNAL_KEY</code>。
            </span>
          </div>
        )}

        <Table
          rowKey="sessionId"
          data={rows}
          columns={columns}
          loading={loading}
          size="small"
          hover
          stripe
          empty="暂无对话记录"
          onRowClick={({ row }) => openDetail(row)}
          pagination={{
            total,
            current: page,
            pageSize: PAGE_SIZE,
            showJumper: true,
            onChange: (info) => {
              setPage(info.current);
              void load(info.current, filters);
            },
          }}
        />
      </div>

      <Drawer
        visible={Boolean(detail)}
        size="large"
        header={detail ? `会话详情 · ${detail.title || "（无标题）"}` : "会话详情"}
        footer={false}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
              <span>会话：{detail.sessionId}</span>
              <span>归属：{detail.userId ? ownerText(detail) : "匿名"}</span>
              <span>轮次：{detail.messageCount}</span>
              <span>Token：{detail.tokens}</span>
              <span>创建：{formatLocalTime(detail.createdAt)}</span>
              {detail.deletedAt && (
                <span className="text-amber-600">用户已删除：{formatLocalTime(detail.deletedAt)}</span>
              )}
            </div>

            {messages.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag theme={m.role === "user" ? "primary" : "default"} variant="light" size="small">
                    {m.role === "user" ? "用户" : "派蒙"}
                  </Tag>
                  {m.degraded && (
                    <Tag theme="danger" variant="light" size="small">
                      降级
                    </Tag>
                  )}
                  {/* 只有判定为无关（true）才显示；null = 未判定，不显示也不当成"有关" */}
                  {m.offTopic === true && (
                    <Tag theme="danger" variant="light" size="small">
                      无关 · {OFF_TOPIC_REASONS[m.offTopicReason] ?? m.offTopicReason}
                    </Tag>
                  )}
                  <span className="text-xs text-slate-400">{formatLocalTime(m.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                  {m.content || "（空）"}
                </p>
                {m.role === "assistant" && (
                  <p className="mt-2 text-xs text-slate-400">
                    {m.model || "—"} · {m.profile || "—"}档 · token {m.tokens}（输入 {m.tokensInput} / 输出{" "}
                    {m.tokensOutput} / 缓存 {m.tokensCached}） · {m.elapsedMs}ms
                  </p>
                )}
              </div>
            ))}

            {!messagesLoading && messages.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">该会话没有消息</p>
            )}

            {hasMore && (
              <div className="text-center">
                <Button variant="outline" loading={messagesLoading} onClick={loadMoreMessages}>
                  加载更多
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
