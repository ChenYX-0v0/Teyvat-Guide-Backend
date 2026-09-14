"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Dialog, Input, MessagePlugin, Switch, Table, Tag } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { formatLocalTime } from "@/lib/format";
import { DAILY_TOKEN_WATCH_THRESHOLD } from "@/lib/teyvat/constants";
import { createUserAction, listUsersAction, setUserBannedAction, type UserRow } from "./user-actions";

const PAGE_SIZE = 20;

/** 新增账号表单（本站不开放公开注册，账号由管理员代建后转达受邀用户） */
type CreateEditor = {
  username: string;
  password: string;
  displayName: string;
};

const EMPTY_CREATE: CreateEditor = { username: "", password: "", displayName: "" };

export function UserManagementPanel({ onViewChats }: { onViewChats?: (userId: number) => void }) {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  // 观测筛选（2026-09-14 新增）：今日用量 ≥ 5 万观察线 / 有无关提问
  const [watchOnly, setWatchOnly] = useState(false);
  const [offTopicOnly, setOffTopicOnly] = useState(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [notReadyMessage, setNotReadyMessage] = useState("");
  const [pending, setPending] = useState<UserRow | null>(null);
  // 邀请制：C 端不开放自助注册，账号只能在这里代建（口径见 shared-docs/04 §2.3 / §4.2）
  const [creator, setCreator] = useState<CreateEditor | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    async (
      targetPage = page,
      searchKeyword = keyword,
      watch = watchOnly,
      offTopic = offTopicOnly,
    ) => {
    setLoading(true);
    setNotReadyMessage("");
    try {
      const result = await listUsersAction({
        keyword: searchKeyword,
        // 5 万是「观察线」：只看，不拦（10 万拦截在主服务侧）
        minDailyTokens: watch ? DAILY_TOKEN_WATCH_THRESHOLD : undefined,
        onlyOffTopic: offTopic || undefined,
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
    [keyword, page, watchOnly, offTopicOnly],
  );

  useEffect(() => {
    load(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(() => {
    setPage(1);
    load(1, keyword, watchOnly, offTopicOnly);
  }, [keyword, load, offTopicOnly, watchOnly]);

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

  const handleCreate = useCallback(async () => {
    if (!creator) return;
    if (!creator.username.trim() || !creator.password) {
      MessagePlugin.warning("用户名与密码都不能为空");
      return;
    }
    setCreating(true);
    try {
      const result = await createUserAction({
        username: creator.username.trim(),
        password: creator.password,
        displayName: creator.displayName.trim() || undefined,
      });
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      MessagePlugin.success(`已创建「${result.item?.username}」——请把用户名与密码转达给受邀用户`);
      setCreator(null);
      await load(1, keyword);
    } finally {
      setCreating(false);
    }
  }, [creator, keyword, load]);

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
    {
      colKey: "todayTokens",
      title: "今日 Token",
      width: 200,
      cell: ({ row }) => (
        <div className="leading-tight">
          {row.todayTokens >= DAILY_TOKEN_WATCH_THRESHOLD ? (
            <Tag theme="warning" variant="light">
              {row.todayTokens}
            </Tag>
          ) : (
            <span>{row.todayTokens || "—"}</span>
          )}
          {/* 细分：cached 与未命中单价差约 50 倍，只看总数算不出真实成本 */}
          <p className="mt-0.5 text-[11px] text-slate-400">
            入 {row.todayInput} · 出 {row.todayOutput} · 缓存 {row.todayCached} · {row.todayRequests} 次
          </p>
        </div>
      ),
    },
    {
      colKey: "offTopicCount",
      title: "无关提问",
      width: 110,
      cell: ({ row }) =>
        row.offTopicCount > 0 ? (
          <Tag theme="danger" variant="light">
            {row.offTopicCount}
          </Tag>
        ) : (
          "—"
        ),
    },
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
              「今日 ≥ 5 万 Token」是<b>观察线</b>（不是限制，拦截线 10 万在主服务侧）；
              「有无关提问」只看判定为与游戏无关的提问数（判定未开启时为空集）。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Switch value={watchOnly} onChange={(value) => setWatchOnly(Boolean(value))} />
              今日 ≥ 5 万 Token
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Switch
                value={offTopicOnly}
                onChange={(value) => setOffTopicOnly(Boolean(value))}
              />
              有无关提问
            </label>
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
            <Button variant="outline" onClick={() => setCreator({ ...EMPTY_CREATE })}>
              新增用户
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

      {/* 新增账号：本站不开放注册，这是唯一的开户入口 */}
      <Dialog
        header="新增用户账号"
        visible={Boolean(creator)}
        width={520}
        confirmBtn={{ content: "创建", loading: creating }}
        onClose={() => setCreator(null)}
        onConfirm={handleCreate}
      >
        {creator && (
          <div className="space-y-4">
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              本站为<b>不公开邀请制</b>，C 端已关闭自助注册——账号只能在这里创建，再把用户名与密码转达给受邀用户。
              用户名 3~32 字符，密码至少 6 位。
            </p>
            <div>
              <p className="mb-1 text-sm text-slate-600">用户名（登录用，3~32 字符）</p>
              <Input
                value={creator.username}
                onChange={(value) => setCreator((s) => (s ? { ...s, username: String(value) } : s))}
                placeholder="traveler"
              />
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-600">密码（至少 6 位）</p>
              <Input
                value={creator.password}
                onChange={(value) => setCreator((s) => (s ? { ...s, password: String(value) } : s))}
                placeholder="至少 6 位"
              />
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-600">昵称（可选，缺省与用户名相同）</p>
              <Input
                value={creator.displayName}
                onChange={(value) => setCreator((s) => (s ? { ...s, displayName: String(value) } : s))}
                placeholder="旅行者"
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
