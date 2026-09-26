"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Loading, MessagePlugin, Select, Tag } from "tdesign-react";
import { exportUsageCsv, loadUsageStats, type UsageStatsPayload } from "./usage-actions";

/**
 * 「使用统计」看板（口径真源：teyvat-guide 仓 shared-docs/07-前端埋点与使用统计.md）
 *
 * ⚠️ 两条口径必须写在界面上，否则看数的人会误判：
 *  - **UV 只统计登录用户**（D1 不采集匿名标识）→ 匿名行为只有次数；
 *  - **漏斗是 PV 口径**（不是人数）。
 */

/**
 * 事件中文名映射（与主服务白名单 server/internal/service/usage.go 的 usageEventProps 一一对应）。
 *
 * ⚠️ 新增埋点事件时**必须同步加一行**：没登记的会显示成「未登记 + 原始名」——
 * 这是刻意做的"漂移可见化"，免得又出现"面板里冒出一个看不懂的英文名"。
 * 事件字典真源：teyvat-guide 仓 shared-docs/07-前端埋点与使用统计.md §5。
 */
const EVENT_LABELS: Record<string, string> = {
  page_view: "页面浏览",
  page_leave: "页面停留",
  home_cta_click: "首页入口点击",
  chat_message_sent: "发起提问",
  chat_stream_failed: "回答失败",
  chat_new_session: "新建对话",
  chat_session_opened: "打开历史会话",
  chat_session_deleted: "删除会话",
  chat_preset_expanded: "展开预设问答",
  account_uid_query: "UID 查询",
  account_uid_bind: "绑定 UID",
  account_unbind: "解绑 UID",
  auth_login: "登录",
  web_error: "前端异常",
  // ── 账号页悬浮 AI 体检（v1.1，随 web/13 落地）──
  account_analysis_open: "打开体检面板",
  account_analysis_auto: "自动体检发出",
  account_analysis_rerun: "点重新分析",
  account_analysis_end: "体检完成",
};

const RANGES = [
  { value: 7, label: "近 7 天" },
  { value: 30, label: "近 30 天" },
];

/** 本地日期偏移（YYYY-MM-DD，与后端按天口径一致） */
function dayStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/** 横向条形（不引图表库：占比条足够回答"谁高谁低"） */
function Bar({ ratio }: { ratio: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-blue-500"
        style={{ width: `${Math.max(2, Math.round(ratio * 100))}%` }}
      />
    </div>
  );
}

export function UsageStatsPanel() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<UsageStatsPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => ({ from: dayStr(1 - days), to: dayStr(0) }), [days]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadUsageStats(range.from, range.to, days));
    } catch {
      setData({ success: false, message: "加载失败", notReady: false, rank: [], series: [], funnel: [] });
    } finally {
      setLoading(false);
    }
  }, [range, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const download = useCallback(async () => {
    const r = await exportUsageCsv(range.from, range.to);
    if (!r.success || !r.csv) {
      MessagePlugin.error(r.message || "导出失败");
      return;
    }
    const url = URL.createObjectURL(new Blob([r.csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage-${range.from}_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    MessagePlugin.success("已导出");
  }, [range]);

  const maxPv = Math.max(1, ...(data?.rank ?? []).map((r) => r.pv));
  const maxSeries = Math.max(1, ...(data?.series ?? []).map((s) => s.pv));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select
            value={days}
            options={RANGES}
            onChange={(v) => setDays(Number(v))}
            style={{ width: 140 }}
          />
          <span className="text-xs text-slate-500">
            {range.from} ~ {range.to}　·　UV 仅统计登录用户（匿名只计次数）
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void load()} loading={loading}>
            刷新
          </Button>
          <Button theme="primary" onClick={() => void download()}>
            导出 CSV
          </Button>
        </div>
      </div>

      {loading && !data && (
        <Card bordered>
          <Loading loading text="加载中…" />
        </Card>
      )}

      {data && !data.success && (
        <Card bordered>
          <div className="flex items-center gap-2 text-sm text-rose-600">
            <Tag theme="danger" variant="light">
              {data.notReady ? "接口未就绪" : "调用失败"}
            </Tag>
            <span>{data.message}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            检查主服务是否已升级到含埋点版本（`POST /api/events` 与 `/internal/v1/admin/usage/*`），
            以及 `PROJECT_TEYVAT_GUIDE_INTERNAL_KEY` 是否与主服务 `auth.internal_key` 一致。
          </p>
        </Card>
      )}

      {data?.overview && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="页面浏览（含匿名）" value={String(data.overview.pv)} hint={`事件种类 ${data.overview.events}`} />
          <Stat label="登录用户数（UV）" value={String(data.overview.uv)} hint="匿名不参与去重" />
          <Stat label="发起提问（来自对话表）" value={String(data.overview.chatCount)} hint="非埋点，服务端事实" />
          <Stat
            label="平均页面停留"
            value={`${(data.overview.avgDwellMs / 1000).toFixed(1)} 秒`}
            hint={`样本 ${data.overview.dwellSample} 次`}
          />
        </div>
      )}

      <Card title="功能排行榜（次数降序）" bordered>
        {data && data.rank.length === 0 ? (
          <p className="text-sm text-slate-500">这个区间还没有数据（埋点刚上线时属正常）。</p>
        ) : (
          <div className="space-y-3">
            {data?.rank.map((r) => (
              <div key={r.event} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">
                    {EVENT_LABELS[r.event] ?? <span className="text-amber-600">未登记</span>}
                    <span className="ml-2 font-mono text-[11px] text-slate-400">{r.event}</span>
                  </span>
                  <span className="text-slate-600">
                    次数 <b className="text-slate-900">{r.pv}</b>
                    <span className="ml-3 text-slate-400">登录 UV {r.uv}</span>
                  </span>
                </div>
                <Bar ratio={r.pv / maxPv} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="趋势（按天）" bordered>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {data?.series.map((s) => (
              <div key={s.day} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{s.day}</span>
                  <span>
                    PV {s.pv}　·　UV {s.uv}　·　提问 {s.chatCount}
                  </span>
                </div>
                <Bar ratio={s.pv / maxSeries} />
              </div>
            ))}
            {data && data.series.length === 0 && <p className="text-sm text-slate-500">暂无数据</p>}
          </div>
        </Card>

        <Card title="漏斗（PV 口径）" bordered>
          <div className="space-y-3">
            {data?.funnel.map((step, i, arr) => {
              const prev = i === 0 ? null : arr[i - 1].pv;
              const rate = prev && prev > 0 ? `${((step.pv / prev) * 100).toFixed(1)}%` : "—";
              return (
                <div key={step.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-700">{step.label}</span>
                  <span className="text-sm">
                    <b className="text-slate-900">{step.pv}</b>
                    <span className="ml-3 text-xs text-slate-500">环比 {rate}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            前三步是埋点次数，最后一步"二次提问"取自对话表（同会话 ≥2 问的会话数），口径不同属正常。
          </p>
        </Card>
      </div>
    </div>
  );
}
