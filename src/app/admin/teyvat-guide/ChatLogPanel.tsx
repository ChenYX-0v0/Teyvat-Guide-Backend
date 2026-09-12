"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Drawer, Input, MessagePlugin, Switch, Table, Tag } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { formatLocalTime } from "@/lib/format";
import {
  getChatMessagesAction,
  listChatSessionsAction,
  type ChatMessageRow,
  type ChatSessionRow,
} from "./chat-actions";

const PAGE_SIZE = 20;

function ownerText(row: ChatSessionRow) {
  if (!row.userId) return "—";
  const name = row.displayName || row.username || `#${row.userId}`;
  return row.genshinUid ? `${name}（${row.genshinUid}）` : name;
}

export function ChatLogPanel() {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [onlyDegraded, setOnlyDegraded] = useState(false);
  const [onlyDeleted, setOnlyDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ChatSessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [notReadyMessage, setNotReadyMessage] = useState("");

  const [detail, setDetail] = useState<ChatSessionRow | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    async (
      targetPage = page,
      searchKeyword = keyword,
      degradedOnly = onlyDegraded,
      deletedOnly = onlyDeleted,
    ) => {
      setLoading(true);
      setNotReadyMessage("");
      try {
        const result = await listChatSessionsAction({
          keyword: searchKeyword,
          onlyDegraded: degradedOnly,
          onlyDeleted: deletedOnly,
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
    },
    [keyword, onlyDegraded, onlyDeleted, page],
  );

  useEffect(() => {
    load(1, "", false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(() => {
    setPage(1);
    load(1, keyword, onlyDegraded, onlyDeleted);
  }, [keyword, onlyDegraded, onlyDeleted, load]);

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
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={keyword}
              onChange={(value) => setKeyword(String(value))}
              placeholder="搜索提问内容（不含回答）"
              clearable
              style={{ width: 260 }}
              onEnter={handleSearch}
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Switch value={onlyDegraded} onChange={(value) => setOnlyDegraded(Boolean(value))} />
              仅看降级
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Switch value={onlyDeleted} onChange={(value) => setOnlyDeleted(Boolean(value))} />
              仅看已删除
            </label>
            <Button theme="primary" loading={loading} onClick={handleSearch}>
              查询
            </Button>
          </div>
        </div>

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
              load(info.current, keyword, onlyDegraded, onlyDeleted);
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
