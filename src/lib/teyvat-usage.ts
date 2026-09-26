import "server-only";
import { callTeyvatInternal, callTeyvatInternalText, type InternalResult } from "@/lib/teyvat-internal";

/**
 * teyvat-guide **使用统计**接口客户端（只读，服务端 → 服务端直连）。
 *
 * 契约（真源）：teyvat-guide 仓 `shared-docs/07-前端埋点与使用统计.md` §6。
 * 口径要点（2026-09-26 决策）：
 *  - D1 **不采集匿名标识** → `uv` 只统计登录用户；匿名行为只有 `pv`（次数）；
 *  - 漏斗是 **PV 口径**，不是人数；
 *  - 明细保留 90 天，聚合表永久。
 */

export type UsageOverview = {
  from: string;
  to: string;
  pv: number;
  uv: number;
  events: number;
  chatCount: number;
  avgDwellMs: number;
  dwellSample: number;
};

export type UsageRankRow = { event: string; pv: number; uv: number };
export type UsageSeriesRow = { day: string; pv: number; uv: number; chatCount: number };
export type UsageFunnelStep = { key: string; label: string; pv: number };

export function fetchUsageOverview(from: string, to: string): Promise<InternalResult<UsageOverview>> {
  return callTeyvatInternal<UsageOverview>(`/internal/v1/admin/usage/overview?from=${from}&to=${to}`);
}

export function fetchUsageEvents(from: string, to: string, limit = 30): Promise<InternalResult<{ items: UsageRankRow[] }>> {
  return callTeyvatInternal<{ items: UsageRankRow[] }>(`/internal/v1/admin/usage/events?from=${from}&to=${to}&limit=${limit}`);
}

export function fetchUsageSeries(days: number): Promise<InternalResult<{ items: UsageSeriesRow[] }>> {
  return callTeyvatInternal<{ items: UsageSeriesRow[] }>(`/internal/v1/admin/usage/series?days=${days}`);
}

export function fetchUsageFunnel(from: string, to: string): Promise<InternalResult<{ steps: UsageFunnelStep[] }>> {
  return callTeyvatInternal<{ steps: UsageFunnelStep[] }>(`/internal/v1/admin/usage/funnel?from=${from}&to=${to}`);
}

/** 导出明细 CSV（返回 text/csv，不是统一信封） */
export function fetchUsageCsv(from: string, to: string, event?: string) {
  const q = new URLSearchParams({ from, to });
  if (event) q.set("event", event);
  return callTeyvatInternalText(`/internal/v1/admin/usage/export?${q.toString()}`);
}
