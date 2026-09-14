"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Dialog, Input, MessagePlugin, Table, Tag } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { formatLocalTime } from "@/lib/format";
import { listUsersAction, setUserBannedAction, type UserRow } from "./user-actions";

const PAGE_SIZE = 20;

export function UserManagementPanel({ onViewChats }: { onViewChats?: (userId: number) => void }) {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [notReadyMessage, setNotReadyMessage] = useState("");
  const [pending, setPending] = useState<UserRow | null>(null);

  const load = useCallback(async (targetPage = page, searchKeyword = keyword) => {
    setLoading(true);
    setNotReadyMessage("");
    try {
      const result = await listUsersAction({ keyword: searchKeyword, page: targetPage, pageSize: PAGE_SIZE });
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
  }, [keyword, page]);

  useEffect(() => {
    load(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(() => {
    setPage(1);
    load(1, keyword);
  }, [keyword, load]);

  const handleToggleBan = useCallback(async () => {
    if (!pending) return;
    const target = pending;
    setPending(null);
    const nextBanned = target.status !== "banned";
    const result = await setUserBannedAction(target.id, nextBanned);
    if (!result.success) {
      MessagePlugin.error(result.message);
      return;
    }
    MessagePlugin.success(nextBanned ? "已封禁" : "已解封");
    await load(page, keyword);
  }, [pending, load, page, keyword]);

  const columns: PrimaryTableCol<UserRow>[] = [
    { colKey: "id", title: "ID", width: 90 },
    { colKey: "username", title: "用户名", width: 160 },
    { colKey: "displayName", title: "昵称", width: 140 },
    { colKey: "genshinUid", title: "游戏 UID", width: 130, cell: ({ row }) => row.genshinUid || "—" },
    {
      colKey: "status",
      title: "状态",
      width: 100,
      cell: ({ row }) => (row.status === "banned" ? <Tag theme="danger" variant="light">已封禁</Tag> : <Tag theme="success" variant="light">正常</Tag>),
    },
    { colKey: "totalTokens", title: "累计 Token", width: 120 },
    { colKey: "createdAt", title: "注册时间", width: 180, cell: ({ row }) => formatLocalTime(row.createdAt) },
    { colKey: "lastLoginAt", title: "最近登录", width: 180, cell: ({ row }) => formatLocalTime(row.lastLoginAt) },
    {
      colKey: "actions",
      title: "操作",
      width: 160,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {onViewChats && (
            <Button size="small" variant="text" onClick={() => onViewChats(row.id)}>
              查看对话
            </Button>
          )}
          <Button
            size="small"
            variant="text"
            theme={row.status === "banned" ? "primary" : "danger"}
            onClick={() => setPending(row)}
          >
            {row.status === "banned" ? "解封" : "封禁"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">用户管理</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              经内网接口读取 web 服务器（teyvat-guide）的用户；浏览器不接触内网密钥与用户库。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={keyword}
              onChange={(value) => setKeyword(String(value))}
              placeholder="搜索用户名 / 昵称 / UID"
              clearable
              style={{ width: 260 }}
              onEnter={handleSearch}
            />
            <Button theme="primary" loading={loading} onClick={handleSearch}>
              查询
            </Button>
          </div>
        </div>

        {notReadyMessage && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            接口未就绪：{notReadyMessage}
            <span className="mt-1 block text-xs text-amber-600">
              需在 teyvat-guide 主服务实现 <code>GET /internal/v1/admin/users</code>、<code>POST /internal/v1/admin/users/status</code>
              （<code>X-Internal-Key</code> 鉴权），并配置本系统 <code>PROJECT_TEYVAT_GUIDE_INTERNAL_KEY</code>。
            </span>
          </div>
        )}

        <Table
          rowKey="id"
          data={rows}
          columns={columns}
          loading={loading}
          size="small"
          hover
          stripe
          empty="暂无用户"
          pagination={{
            total,
            current: page,
            pageSize: PAGE_SIZE,
            showJumper: true,
            onChange: (info) => {
              setPage(info.current);
              load(info.current, keyword);
            },
          }}
        />
      </div>

      <Dialog
        header={pending?.status === "banned" ? "确认解封" : "确认封禁"}
        visible={Boolean(pending)}
        theme="warning"
        onClose={() => setPending(null)}
        onConfirm={handleToggleBan}
        confirmBtn={{ content: pending?.status === "banned" ? "解封" : "封禁", theme: pending?.status === "banned" ? "primary" : "danger" }}
      >
        <p>
          确定{pending?.status === "banned" ? "解封" : "封禁"}用户「{pending?.username}」（ID: {pending?.id}）吗？
          {pending?.status === "banned" ? "" : "封禁后其登录会话将失效。"}
        </p>
      </Dialog>
    </div>
  );
}
