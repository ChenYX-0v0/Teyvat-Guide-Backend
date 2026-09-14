"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dialog, Input, MessagePlugin, Switch, Table, Tag, Textarea } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { formatLocalTime } from "@/lib/format";
import {
  createPromptAction,
  listPromptsAction,
  setPromptEnabledAction,
  type PromptRow,
} from "./prompt-actions";

/**
 * 编辑器状态（只用于**新增版本**：内容按版本不可变，没有"改内容"这条路）。
 * fromRow = 从某个已有版本复制内容过来（改文案的标准姿势）。
 */
type Editor = {
  sceneKey: string;
  content: string;
  remark: string;
  enabled: boolean;
};

const EMPTY_EDITOR: Editor = {
  sceneKey: "paimon_rules",
  content: "",
  remark: "",
  enabled: true,
};

/** 列表里只给摘要，正文点「查看」看 */
function contentSummary(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 60 ? `${flat.slice(0, 60)}…` : flat;
}

export function PromptPanel() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<PromptRow[]>([]);
  const [servedScenes, setServedScenes] = useState<string[]>([]);
  const [notReadyMessage, setNotReadyMessage] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [preview, setPreview] = useState<PromptRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotReadyMessage("");
    try {
      const result = await listPromptsAction();
      if (!result.success) {
        setRows([]);
        setServedScenes([]);
        if (result.notReady) setNotReadyMessage(result.message);
        else MessagePlugin.error(result.message);
        return;
      }
      setRows(result.items);
      setServedScenes(result.servedScenes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 每个场景当前生效的版本号（用于列表里标「生效中」） */
  const effectiveVersion = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.effective) map.set(row.sceneKey, row.version);
    }
    return map;
  }, [rows]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    if (!editor.sceneKey.trim() || !editor.content.trim()) {
      MessagePlugin.warning("场景键与提示词内容都不能为空");
      return;
    }
    setSaving(true);
    try {
      const result = await createPromptAction({
        sceneKey: editor.sceneKey.trim(),
        content: editor.content.trim(),
        remark: editor.remark.trim(),
        enabled: editor.enabled,
      });
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      const version = result.item?.version;
      MessagePlugin.success(
        result.item?.enabled
          ? `已新增 v${version} 并启用（AI 服务最迟 1 分钟内生效）`
          : `已新增 v${version}（未启用，不会生效）`,
      );
      setEditor(null);
      await load();
    } finally {
      setSaving(false);
    }
  }, [editor, load]);

  /** 启用 / 停用：停用当前生效版本 = 回滚到上一版 */
  const toggleEnabled = useCallback(
    async (row: PromptRow, enabled: boolean) => {
      const result = await setPromptEnabledAction(row.id, enabled);
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      const scene = row.sceneKey;
      const fallback = rows
        .filter((it) => it.sceneKey === scene && it.id !== row.id && it.enabled)
        .sort((a, b) => b.version - a.version)[0];
      if (enabled) {
        MessagePlugin.success(`已启用 v${row.version}（最迟 1 分钟内生效）`);
      } else if (fallback) {
        MessagePlugin.success(`已停用 v${row.version}，回滚到 v${fallback.version}`);
      } else {
        MessagePlugin.warning(`已停用 v${row.version}，该场景当前没有任何启用版本`);
      }
      await load();
    },
    [load, rows],
  );

  const columns: PrimaryTableCol<PromptRow>[] = useMemo(
    () => [
      {
        colKey: "sceneKey",
        title: "场景",
        width: 170,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs text-slate-700">{row.sceneKey}</span>
            {!row.served && (
              <Tag theme="warning" variant="light" size="small">
                当前不生效
              </Tag>
            )}
          </div>
        ),
      },
      {
        colKey: "version",
        title: "版本",
        width: 110,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs">v{row.version}</span>
            {effectiveVersion.get(row.sceneKey) === row.version && (
              <Tag theme="success" variant="light" size="small">
                生效中
              </Tag>
            )}
          </div>
        ),
      },
      {
        colKey: "content",
        title: "内容摘要",
        cell: ({ row }) => <span className="text-xs text-slate-500">{contentSummary(row.content)}</span>,
      },
      {
        colKey: "remark",
        title: "备注",
        width: 200,
        cell: ({ row }) => <span className="text-xs text-slate-500">{row.remark || "—"}</span>,
      },
      {
        colKey: "enabled",
        title: "状态",
        width: 140,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch value={row.enabled} onChange={(value) => void toggleEnabled(row, Boolean(value))} />
            {row.enabled ? (
              <Tag theme="success" variant="light" size="small">
                已启用
              </Tag>
            ) : (
              <Tag theme="default" variant="light" size="small">
                已停用
              </Tag>
            )}
          </div>
        ),
      },
      {
        colKey: "updatedAt",
        title: "更新时间",
        width: 170,
        cell: ({ row }) => formatLocalTime(row.updatedAt),
      },
      {
        colKey: "actions",
        title: "操作",
        width: 170,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button size="small" variant="text" theme="default" onClick={() => setPreview(row)}>
              查看
            </Button>
            <Button
              size="small"
              variant="text"
              theme="primary"
              onClick={() =>
                setEditor({
                  sceneKey: row.sceneKey,
                  content: row.content,
                  remark: `${row.sceneKey} v${row.version} 基础上修改`,
                  enabled: true,
                })
              }
            >
              以此新建版本
            </Button>
          </div>
        ),
      },
    ],
    [effectiveVersion, toggleEnabled],
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">提示词管理</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              派蒙人格与回答规则<b>存在服务器数据库</b>（不在代码里），改完最迟 1 分钟生效、无需发版。
              <b>内容按版本不可变</b>：改文案一律「新增一版」，老版本留着可随时回滚；
              <b>不做物理删除</b>。生效规则：同一场景下「启用且版本最高」的那一版。
            </p>
            <p className="mt-1 text-xs text-slate-400">
              AI 服务按这个顺序拼接：
              {servedScenes.length > 0 ? (
                <span className="ml-1 font-mono text-slate-500">{servedScenes.join(" → ")}</span>
              ) : (
                <span className="ml-1">（读取中）</span>
              )}
              ——顺序即前缀缓存的稳定性依据，不要随意调整。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" loading={loading} onClick={() => void load()}>
              刷新
            </Button>
            <Button theme="primary" onClick={() => setEditor({ ...EMPTY_EDITOR })}>
              新增版本
            </Button>
          </div>
        </div>

        {notReadyMessage && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            接口未就绪：{notReadyMessage}
            <span className="mt-1 block text-xs text-amber-600">
              需 teyvat-guide 主服务提供 <code>/internal/v1/admin/ai-prompts</code>（<code>X-Internal-Key</code>
              鉴权），并配置本系统 <code>PROJECT_TEYVAT_GUIDE_INTERNAL_KEY</code>。
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
          empty="暂无提示词版本"
        />
      </div>

      {/* 新增版本（唯一的内容变更入口） */}
      <Dialog
        header={`新增提示词版本${editor ? ` · ${editor.sceneKey}` : ""}`}
        visible={Boolean(editor)}
        width={760}
        confirmBtn={{ content: "新增并保存", loading: saving }}
        onClose={() => setEditor(null)}
        onConfirm={handleSave}
      >
        {editor && (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm text-slate-600">
                场景键（AI 服务只读 {servedScenes.join(" / ") || "paimon_*"}；写其它场景会入库但当前不生效）
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={editor.sceneKey}
                  onChange={(value) => setEditor((s) => (s ? { ...s, sceneKey: String(value) } : s))}
                  placeholder="paimon_rules"
                />
                {servedScenes.map((scene) => (
                  <Button
                    key={scene}
                    size="small"
                    variant="outline"
                    onClick={() => setEditor((s) => (s ? { ...s, sceneKey: scene } : s))}
                  >
                    {scene}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-600">
                提示词内容（最多 20000 字；版本号由系统分配，不用填）
              </p>
              <Textarea
                value={editor.content}
                onChange={(value) => setEditor((s) => (s ? { ...s, content: String(value) } : s))}
                autosize={{ minRows: 12, maxRows: 24 }}
                placeholder="【回答规则】……"
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <p className="mb-1 text-sm text-slate-600">备注（说明这一版改了什么，便于回滚时判断）</p>
                <Input
                  value={editor.remark}
                  onChange={(value) => setEditor((s) => (s ? { ...s, remark: String(value) } : s))}
                  placeholder="例如：禁止 Markdown 标记 + 只说结论"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <Switch
                  value={editor.enabled}
                  onChange={(value) => setEditor((s) => (s ? { ...s, enabled: Boolean(value) } : s))}
                />
                保存后立即启用
              </label>
            </div>
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              保存后该场景的生效版本会变成新的这一版（最迟 1 分钟），老版本仍在列表里——发现不对，
              把新版本「状态」关掉即可回滚，不需要改任何内容。
            </p>
          </div>
        )}
      </Dialog>

      {/* 查看某一版全文（只读） */}
      <Dialog
        header={preview ? `${preview.sceneKey} v${preview.version}${preview.effective ? "（生效中）" : ""}` : ""}
        visible={Boolean(preview)}
        width={760}
        footer={false}
        onClose={() => setPreview(null)}
      >
        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Tag theme={preview.enabled ? "success" : "default"} variant="light" size="small">
                {preview.enabled ? "已启用" : "已停用"}
              </Tag>
              <span>创建：{formatLocalTime(preview.createdAt)}</span>
              <span>更新：{formatLocalTime(preview.updatedAt)}</span>
              <span>{preview.remark || "无备注"}</span>
            </div>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
              {preview.content}
            </pre>
          </div>
        )}
      </Dialog>
    </div>
  );
}
