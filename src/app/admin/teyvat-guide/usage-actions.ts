"use server";

import { requireAdmin } from "@/lib/session";
import {
  fetchUsageCsv,
  fetchUsageEvents,
  fetchUsageFunnel,
  fetchUsageOverview,
  fetchUsageSeries,
  type UsageFunnelStep,
  type UsageOverview,
  type UsageRankRow,
  type UsageSeriesRow,
} from "@/lib/teyvat-usage";

/**
 * 后台「使用统计」看板的 Server Actions。
 * 浏览器只跟 Next 服务端说话，内网密钥与接口地址不出服务端（与「对话记录」同模式）。
 */

export type UsageStatsPayload = {
  success: boolean;
  message: string;
  notReady: boolean;
  overview?: UsageOverview;
  rank: UsageRankRow[];
  series: UsageSeriesRow[];
  funnel: UsageFunnelStep[];
};

/** 一次取齐看板需要的四块数据（并发） */
export async function loadUsageStats(from: string, to: string, days: number): Promise<UsageStatsPayload> {
  await requireAdmin();

  const [overview, events, series, funnel] = await Promise.all([
    fetchUsageOverview(from, to),
    fetchUsageEvents(from, to, 30),
    fetchUsageSeries(days),
    fetchUsageFunnel(from, to),
  ]);

  const failed = [overview, events, series, funnel].find((r) => !r.success);
  return {
    success: !failed,
    message: failed?.message ?? "ok",
    notReady: failed?.notReady ?? false,
    overview: overview.data,
    rank: events.data?.items ?? [],
    series: series.data?.items ?? [],
    funnel: funnel.data?.steps ?? [],
  };
}

/** 导出 CSV：把文本回给客户端，由客户端触发下载（不落盘、不占服务端空间） */
export async function exportUsageCsv(
  from: string,
  to: string,
): Promise<{ success: boolean; message: string; csv?: string }> {
  await requireAdmin();
  const r = await fetchUsageCsv(from, to);
  return { success: r.success, message: r.message, csv: r.text };
}
