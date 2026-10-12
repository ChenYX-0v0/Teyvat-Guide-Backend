"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Dialog, Input, InputNumber, MessagePlugin, Switch, Table, Tag } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { formatLocalTime } from "@/lib/format";
import {
  createInviteCodesAction,
  listInviteCodesAction,
  setInviteEnabledAction,
  type InviteRow,
} from "./invite-actions";

/**
 * 邀请码管理（2026-10-12 新增）。
 *
 * 为什么要有这个页面：邀请码是**注册的第二道门**（第一道是短信验证码 ✓），
 * 而它此前只能靠命令行调内网接口生成 —— 主服务的注释里就写着"后台（demo-app）将来接一个页面即可" ✓。
 *
 * 页面要让人一眼看懂的**四条服务端口径**（别在界面上去"简化"它们 ✗）：
 *   1. **一次性**：用过一次即作废 ✓（`usedAt` 非空 = 已作废，这是唯一判据 ✓）；
 *   2. **发短信前先验码** ⇒ 码不对**一条短信都不会发**（不产生费用 ✓）；
 *   3. **作废发生在注册成功那一刻** ⇒ 用户填错短信码 / 中途放弃，**不会把码烧掉** ✓；
 *   4. **停用 = 收回，但不删行** ✓（留痕便于对账），所以操作叫"停用 / 启用"而不是"删除" ✓。
 *
 * ⚠️ 明文码只在**生成接口的响应**里出现一次 ⇒ 生成后必须立刻复制走 ✗（页面用弹窗强提示 ✓）。
 */
export function InviteCodePanel() {
  const [loading, setLoading] = useState(false);
  const [unusedOnly, setUnusedOnly] = useState(true);
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [usable, setUsable] = useState(0);
  const [notReadyMessage, setNotReadyMessage] = useState("");

  // 生成弹窗（备注 + 数量）
  const [creator, setCreator] = useState<{ note: string; count: number } | null>(null);
  const [creating, setCreating] = useState(false);
  // 刚生成出来的明文码：关闭弹窗即从内存消失（后端也不会再返回 ✓）
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  // 停用 / 启用确认
  const [pending, setPending] = useState<InviteRow | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async (onlyUnused: boolean) => {
    setLoading(true);
    setNotReadyMessage("");
    try {
      const result = await listInviteCodesAction(onlyUnused);
      if (!result.success) {
        setRows([]);
        setUsable(0);
        if (result.notReady) setNotReadyMessage(result.message);
        else MessagePlugin.error(result.message);
        return;
      }
      setRows(result.items);
      setUsable(result.usable);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(unusedOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = useCallback(async () => {
    if (!creator) return;
    setCreating(true);
    try {
      const result = await createInviteCodesAction(creator.note.trim(), creator.count || 1);
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      setCreator(null);
      setFreshCodes(result.codes);
      MessagePlugin.success(`已生成 ${result.codes.length} 张邀请码`);
      await load(unusedOnly);
    } finally {
      setCreating(false);
    }
  }, [creator, load, unusedOnly]);

  const handleToggle = useCallback(async () => {
    if (!pending) return;
    const target = pending;
    setPending(null);
    setToggling(true);
    try {
      const result = await setInviteEnabledAction(target.code, !target.enabled);
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      MessagePlugin.success(target.enabled ? "已停用（收回，不删行）" : "已重新启用");
      await load(unusedOnly);
    } finally {
      setToggling(false);
    }
  }, [pending, load, unusedOnly]);

  const copyCodes = useCallback(async () => {
    if (!freshCodes || freshCodes.length === 0) return;
    try {
      await navigator.clipboard.writeText(freshCodes.join("\n"));
      MessagePlugin.success("已复制到剪贴板");
    } catch {
      MessagePlugin.warning("复制失败，请手动选中复制");
    }
  }, [freshCodes]);

  const columns: PrimaryTableCol<InviteRow>[] = [
    {
      colKey: "code",
      title: "邀请码",
      width: 180,
      cell: ({ row }) => <span className="font-mono text-slate-800">{row.code}</span>,
    },
    { colKey: "note", title: "备注", ellipsis: true, cell: ({ row }) => row.note || "—" },
    {
      colKey: "enabled",
      title: "状态",
      width: 110,
      cell: ({ row }) =>
        row.usedAt ? (
          <Tag theme="default" variant="light">已使用</Tag>
        ) : row.enabled ? (
          <Tag theme="success" variant="light">可用</Tag>
        ) : (
          <Tag theme="warning" variant="light">已停用</Tag>
        ),
    },
    {
      colKey: "usedAt",
      title: "核销情况",
      width: 250,
      cell: ({ row }) =>
        row.usedAt ? (
          <div className="leading-tight">
            <p>{formatLocalTime(row.usedAt)}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              用户 {row.usedBy ?? "—"} · {row.usedPhone || "未留手机号"}
            </p>
          </div>
        ) : (
          "—"
        ),
    },
    {
      colKey: "createdAt",
      title: "生成时间",
      width: 180,
      cell: ({ row }) => formatLocalTime(row.createdAt),
    },
    {
      colKey: "actions",
      title: "操作",
      width: 100,
      cell: ({ row }) => (
        <Button
          size="small"
          variant="text"
          theme={row.enabled ? "danger" : "primary"}
          // 已用过的码本身已作废，没有"停用"的意义（服务端也不会因此复活它 ✓）
          disabled={Boolean(row.usedAt)}
          onClick={() => setPending(row)}
        >
          {row.enabled ? "停用" : "启用"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">邀请码管理</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              经内网接口读写 web 服务器（teyvat-guide）；浏览器不接触内网密钥。
              邀请码是<b>注册的第二道门</b>：一次性 ✓、<b>发短信前先验码</b>（码不对一条短信都不发 ✓）、
              作废发生在<b>注册成功那一刻</b>（填错短信码 / 中途放弃不烧码 ✓）、
              <b>停用＝收回但不删行</b>（留痕对账 ✓）。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-slate-50 px-4 py-2 text-center">
              <p className="text-xl font-semibold text-blue-600">{usable}</p>
              <p className="text-[11px] text-slate-500">可用码</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Switch
                value={unusedOnly}
                onChange={(value) => {
                  const next = Boolean(value);
                  setUnusedOnly(next);
                  void load(next);
                }}
              />
              只看可用（未使用且启用）
            </label>
            <Button
              theme="primary"
              loading={loading}
              onClick={() => {
                void load(unusedOnly);
              }}
            >
              刷新
            </Button>
            <Button variant="outline" onClick={() => setCreator({ note: "", count: 1 })}>
              生成邀请码
            </Button>
          </div>
        </div>

        {notReadyMessage && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            接口未就绪：{notReadyMessage}
            <p className="mt-1 text-xs text-amber-600">
              多半是这两件事：主服务该组路由未注册（<code>auth.internal_key</code> 未配置）✓、
              或后台未配 <code>PROJECT_TEYVAT_GUIDE_INTERNAL_KEY</code> / 项目 <code>base_url</code> 指错 ✓。
            </p>
          </div>
        )}

        <Table
          data={rows}
          columns={columns}
          rowKey="code"
          bordered
          stripe
          hover
          size="medium"
          loading={loading}
          empty={unusedOnly ? "没有可用的邀请码" : "还没有生成过邀请码"}
        />
      </div>

      {/* 生成：备注 + 数量 */}
      <Dialog
        header="生成邀请码"
        visible={Boolean(creator)}
        onClose={() => setCreator(null)}
        onConfirm={handleCreate}
        confirmBtn={{ content: "生成", loading: creating }}
        cancelBtn="取消"
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-sm text-slate-600">备注（建议写清发给谁 / 什么渠道，便于对账）</p>
            <Input
              value={creator?.note ?? ""}
              onChange={(value) => setCreator((prev) => (prev ? { ...prev, note: String(value) } : prev))}
              placeholder="例如：某渠道 2026-10-12"
              clearable
            />
          </div>
          <div>
            <p className="mb-1 text-sm text-slate-600">数量</p>
            <InputNumber
              value={creator?.count ?? 1}
              min={1}
              max={50}
              onChange={(value) =>
                setCreator((prev) => (prev ? { ...prev, count: Number(value) || 1 } : prev))
              }
            />
          </div>
          <p className="text-xs text-slate-400">
            生成后请<b>立刻复制</b>明文码 —— 页面关闭后就看不到了（服务端只存码本身，列表不回显 ✓）。
          </p>
        </div>
      </Dialog>

      {/* 生成结果：明文码只出现这一次 */}
      <Dialog
        header="邀请码已生成（请立刻复制）"
        visible={Boolean(freshCodes)}
        onClose={() => setFreshCodes(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={copyCodes}>
              复制全部
            </Button>
            <Button theme="primary" onClick={() => setFreshCodes(null)}>
              我已复制
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          这 {freshCodes?.length ?? 0} 张码<b>只在这里出现一次</b> ✗ —— 列表页只显示已生成的记录，
          不回显明文（那是刻意的 ✓）。
        </p>
        <pre className="max-h-64 overflow-auto rounded-xl bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-800">
          {(freshCodes ?? []).join("\n")}
        </pre>
      </Dialog>

      {/* 停用 / 启用确认 */}
      <Dialog
        header={pending?.enabled ? "停用这张邀请码？" : "重新启用这张邀请码？"}
        visible={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={handleToggle}
        confirmBtn={{ content: pending?.enabled ? "停用" : "启用", loading: toggling, theme: pending?.enabled ? "danger" : "primary" }}
        cancelBtn="取消"
      >
        <p className="text-sm text-slate-600">
          {pending?.enabled
            ? "停用后这张码就无法再用于注册（相当于收回 ✓）；记录会保留，方便对账 ✓。"
            : "启用后这张码又能用于注册了 ✓（前提是它还没被用过）。"}
        </p>
        <p className="mt-2 font-mono text-sm text-slate-800">{pending?.code}</p>
      </Dialog>
    </div>
  );
}
