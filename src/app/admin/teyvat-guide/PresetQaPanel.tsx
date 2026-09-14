"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Dialog, Input, MessagePlugin, Switch, Table, Tag, Textarea } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { formatLocalTime } from "@/lib/format";
import {
  createPresetQaAction,
  listPresetQaAction,
  updatePresetQaAction,
  type PresetQARow,
} from "./preset-actions";

/** 编辑器状态（id 为空 = 新建；sort 按字符串存，保存时转数字） */
type Editor = {
  id?: number;
  sceneKey: string;
  question: string;
  answer: string;
  sort: string;
  enabled: boolean;
};

const EMPTY_EDITOR: Editor = {
  sceneKey: "onboarding",
  question: "",
  answer: "",
  sort: "1",
  enabled: true,
};

/** 回答在列表里只给摘要，正文点开编辑看 */
function answerSummary(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 40 ? `${flat.slice(0, 40)}…` : flat;
}

export function PresetQaPanel() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<PresetQARow[]>([]);
  const [notReadyMessage, setNotReadyMessage] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotReadyMessage("");
    try {
      const result = await listPresetQaAction();
      if (!result.success) {
        setRows([]);
        if (result.notReady) setNotReadyMessage(result.message);
        else MessagePlugin.error(result.message);
        return;
      }
      setRows(result.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    if (!editor.question.trim() || !editor.answer.trim()) {
      MessagePlugin.warning("提问与回答都不能为空");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        sceneKey: editor.sceneKey.trim(),
        question: editor.question.trim(),
        answer: editor.answer.trim(),
        sort: Number(editor.sort) || 0,
        enabled: editor.enabled,
      };
      const result = editor.id
        ? await updatePresetQaAction(editor.id, payload)
        : await createPresetQaAction(payload);
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      MessagePlugin.success(editor.id ? "已保存（C 端即时生效）" : "已新建（C 端即时生效）");
      setEditor(null);
      await load();
    } finally {
      setSaving(false);
    }
  }, [editor, load]);

  /** 列表里直接上下架：下架只改 enabled，数据保留、随时可恢复 */
  const toggleEnabled = useCallback(
    async (row: PresetQARow, enabled: boolean) => {
      const result = await updatePresetQaAction(row.id, {
        sceneKey: row.sceneKey,
        question: row.question,
        answer: row.answer,
        sort: row.sort,
        enabled,
      });
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      MessagePlugin.success(enabled ? "已上架（C 端立即可见）" : "已下架（C 端不再展示，数据保留）");
      await load();
    },
    [load],
  );

  const columns: PrimaryTableCol<PresetQARow>[] = [
    { colKey: "sceneKey", title: "分组", width: 130, cell: ({ row }) => row.sceneKey || "—" },
    {
      colKey: "question",
      title: "提问",
      cell: ({ row }) => <span className="font-medium text-slate-800">{row.question}</span>,
    },
    {
      colKey: "answer",
      title: "回答",
      width: 280,
      cell: ({ row }) => (
        <span className="text-xs text-slate-500">{answerSummary(row.answer)}</span>
      ),
    },
    { colKey: "sort", title: "排序", width: 80 },
    {
      colKey: "enabled",
      title: "状态",
      width: 150,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch
            value={row.enabled}
            onChange={(value) => void toggleEnabled(row, Boolean(value))}
          />
          {row.enabled ? (
            <Tag theme="success" variant="light" size="small">
              已上架
            </Tag>
          ) : (
            <Tag theme="default" variant="light" size="small">
              已下架
            </Tag>
          )}
        </div>
      ),
    },
    {
      colKey: "updatedAt",
      title: "更新时间",
      width: 180,
      cell: ({ row }) => formatLocalTime(row.updatedAt),
    },
    {
      colKey: "actions",
      title: "操作",
      width: 90,
      cell: ({ row }) => (
        <Button
          size="small"
          variant="text"
          theme="primary"
          onClick={() =>
            setEditor({
              id: row.id,
              sceneKey: row.sceneKey,
              question: row.question,
              answer: row.answer,
              sort: String(row.sort),
              enabled: row.enabled,
            })
          }
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">预设问答</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              C 端<b>未登录</b>用户在对话页看到的内容（不调模型、不消耗 token）。改完即时生效，无需发版。
              <b>不做删除</b>：下架只需关掉「状态」，数据保留、随时可恢复。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" loading={loading} onClick={() => void load()}>
              刷新
            </Button>
            <Button theme="primary" onClick={() => setEditor({ ...EMPTY_EDITOR })}>
              新建
            </Button>
          </div>
        </div>

        {notReadyMessage && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            接口未就绪：{notReadyMessage}
            <span className="mt-1 block text-xs text-amber-600">
              需 teyvat-guide 主服务提供 <code>/internal/v1/admin/preset-qa</code>（<code>X-Internal-Key</code>
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
          empty="暂无预设问答"
        />
      </div>

      <Dialog
        header={editor?.id ? "编辑预设问答" : "新建预设问答"}
        visible={Boolean(editor)}
        width={640}
        confirmBtn={{ content: "保存", loading: saving }}
        onClose={() => setEditor(null)}
        onConfirm={handleSave}
      >
        {editor && (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm text-slate-600">分组（可按场景归类，例如 onboarding / build）</p>
              <Input
                value={editor.sceneKey}
                onChange={(value) => setEditor((s) => (s ? { ...s, sceneKey: String(value) } : s))}
                placeholder="onboarding"
              />
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-600">提问（用户看到的问题，最多 200 字）</p>
              <Input
                value={editor.question}
                onChange={(value) => setEditor((s) => (s ? { ...s, question: String(value) } : s))}
                placeholder="新手开局应该优先做什么？"
              />
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-600">回答（纯文本，最多 4000 字；换行会保留）</p>
              <Textarea
                value={editor.answer}
                onChange={(value) => setEditor((s) => (s ? { ...s, answer: String(value) } : s))}
                autosize={{ minRows: 5, maxRows: 12 }}
                placeholder="先把主线推到能开每日委托……"
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">排序</span>
                <Input
                  value={editor.sort}
                  onChange={(value) => setEditor((s) => (s ? { ...s, sort: String(value) } : s))}
                  style={{ width: 100 }}
                  placeholder="1"
                />
                <span className="text-xs text-slate-400">组内升序</span>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <Switch
                  value={editor.enabled}
                  onChange={(value) => setEditor((s) => (s ? { ...s, enabled: Boolean(value) } : s))}
                />
                上架（关闭即下架，C 端不再展示）
              </label>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
