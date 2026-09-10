"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, MessagePlugin, Table, Tag } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { RefreshIcon } from "tdesign-icons-react";
import { listNotificationsAction, retryNotificationsAction, type NotificationRow } from "./service-actions";

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
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [healthResult, notificationResult] = await Promise.allSettled([
      fetch("/api/gateway/teyvat-guide/api/health"),
      listNotificationsAction(),
    ]);

    if (healthResult.status === "fulfilled") {
      try {
        const data = (await healthResult.value.json()) as GatewayResponse;
        if (healthResult.value.ok && data.success && data.data) {
          setHealth(data.data);
        } else {
          setHealth(null);
          setError(data.message || "无法获取服务状态");
        }
      } catch {
        setHealth(null);
        setError("无法解析服务状态响应");
      }
    } else {
      setHealth(null);
      setError("无法获取服务状态");
    }

    if (notificationResult.status === "fulfilled") {
      setNotifications(notificationResult.value);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const result = await retryNotificationsAction();
      if (result.retried === 0) {
        MessagePlugin.info("当前没有待重试的通知");
      } else if (result.failed === 0) {
        MessagePlugin.success(`重试成功 ${result.succeeded} 条`);
      } else {
        MessagePlugin.warning(`重试完成：成功 ${result.succeeded} 条，仍失败 ${result.failed} 条`);
      }
      await load();
    } finally {
      setRetrying(false);
    }
  }, [load]);

  const columns: PrimaryTableCol<NotificationRow>[] = [
    { colKey: "createdAt", title: "时间", width: 180 },
    { colKey: "action", title: "通知动作", width: 160 },
    { colKey: "httpStatus", title: "状态码", width: 100, cell: ({ row }) => (row.httpStatus ? <Tag variant="light">{row.httpStatus}</Tag> : "—") },
    { colKey: "attempts", title: "已重试", width: 90 },
    { colKey: "message", title: "说明", ellipsis: true },
  ];

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

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">未送达通知</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              映射数据变更后需通知项目刷新内存；发送失败的通知会记录在此，可一键重试。
            </p>
          </div>
          <Button
            type="button"
            size="small"
            theme="primary"
            variant="outline"
            loading={retrying}
            disabled={notifications.length === 0}
            onClick={handleRetry}
          >
            重试全部
          </Button>
        </div>

        <Table
          rowKey="id"
          data={notifications}
          columns={columns}
          size="small"
          hover
          stripe
          empty="没有未送达的通知"
        />
      </div>

      <p className="text-xs text-slate-400">
        服务地址与访问凭证由服务端统一保管，通过网关代理访问业务项目，不会下发到浏览器。
      </p>
    </div>
  );
}
