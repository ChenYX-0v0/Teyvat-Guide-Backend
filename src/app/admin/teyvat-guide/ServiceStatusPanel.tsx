"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Tag } from "tdesign-react";
import { RefreshIcon } from "tdesign-icons-react";

type HealthData = {
  status?: string;
  version?: string;
  time?: string;
};

type GatewayResponse = {
  success?: boolean;
  message?: string;
  data?: HealthData;
};

export function ServiceStatusPanel() {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/gateway/teyvat-guide/api/health");
      const data = (await response.json()) as GatewayResponse;
      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.message || "无法获取服务状态");
      }
      setHealth(data.data);
    } catch (err) {
      setHealth(null);
      setError(err instanceof Error ? err.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const online = Boolean(health);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-500 text-lg font-bold text-white shadow-md">
                提
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">AI 提瓦特向导</h3>
                <p className="mt-0.5 text-xs text-slate-400">面向 C 端用户的 AI 提瓦特向导系统（teyvat-guide）</p>
              </div>
            </div>
          </div>
          <Button type="button" size="small" variant="outline" icon={<RefreshIcon />} loading={loading} onClick={load}>
            刷新
          </Button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">服务状态</p>
            <div className="mt-2">
              {online ? (
                <Tag theme="success" variant="light">在线</Tag>
              ) : loading ? (
                <Tag theme="default" variant="light">检测中</Tag>
              ) : (
                <Tag theme="danger" variant="light">不可达</Tag>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">版本</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{health?.version ?? "—"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">上报时间</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{health?.time ?? "—"}</p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}
      </div>

      <p className="text-xs text-slate-400">
        服务地址与访问凭证由服务端统一保管，通过网关代理访问业务项目，不会下发到浏览器。
      </p>
    </div>
  );
}
