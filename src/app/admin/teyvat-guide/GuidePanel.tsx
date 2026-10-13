"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Dialog, MessagePlugin, Space, Table, Tag, Textarea } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";

import { loadGuidesAction, saveGuideAction, type GuideRow } from "./guide-actions";

/**
 * 角色攻略卡管理（阶段②，见 teyvat-docs/ai/07 TODO-18）。
 *
 * 这套卡是"配队思路 / 毕业线 / 天赋顺序"的**唯一依据** ✓ —— 主服务每问**直查库**
 * （不走 asset 的内存缓存 ✓）⇒ 这里改完**立即生效**、不用 reload、不用发版 ✓。
 *
 * ⚠️ 两条不能忘的口径：
 *  1. **主/副词条不在这里改** ✗ —— 那部分以「资产映射管理 → 推荐属性」为准（能分级、能算分 ✓）；
 *     本面板只维护"为什么这么堆"的思路 ✓
 *  2. 人工订正后，若攻略页**真的更新**了，重跑 `cmd/guideimport` 会整行重写 ✓
 *     （页面没更新则跳过 ⇒ 订正会留着 ✓）
 */

type EditorState = {
  characterId: number;
  name: string;
  teamFrom: string;
  sourceUrl: string;
  sourceRev: string;
  fetchedAt: string;
  values: {
    role: string;
    talents: string;
    weaponPick: string;
    relicPick: string;
    teamPick: string;
    graduation: string;
    notes: string;
  };
};

const TEXT_FIELDS: Array<{ key: keyof EditorState["values"]; label: string; hint: string; rows: [number, number] }> = [
  { key: "teamPick", label: "配队思路", hint: "讲清联动关系、核心队友、为什么这么搭", rows: [4, 12] },
  { key: "graduation", label: "毕业线", hint: "只写数值阈值（如「精通 250~350 即可」）；没把握就别写", rows: [3, 8] },
  { key: "talents", label: "天赋顺序", hint: "如「元素战技＞元素爆发，不升级普通攻击」+ 理由", rows: [2, 6] },
  { key: "weaponPick", label: "武器", hint: "毕业武器（含理由）+ 可选武器", rows: [3, 8] },
  { key: "relicPick", label: "圣遗物", hint: "套装 + 理由（⚠️ 不要写主/副词条 —— 那归「推荐属性」）", rows: [3, 8] },
  { key: "role", label: "定位", hint: "元素 + 定位 + 体系 + 关键命座", rows: [4, 12] },
  { key: "notes", label: "注意事项", hint: "命座 / 手法 / 常见误区", rows: [3, 8] },
];

export function GuidePanel() {
  const [rows, setRows] = useState<GuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await loadGuidesAction());
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : "加载攻略卡失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openEditor = (row: GuideRow) => {
    setEditor({
      characterId: row.characterId,
      name: row.name,
      teamFrom: row.teamFrom,
      sourceUrl: row.sourceUrl,
      sourceRev: row.sourceRev,
      fetchedAt: row.fetchedAt,
      values: {
        role: row.role,
        talents: row.talents,
        weaponPick: row.weaponPick,
        relicPick: row.relicPick,
        teamPick: row.teamPick,
        graduation: row.graduation,
        notes: row.notes,
      },
    });
  };

  const setField = (key: keyof EditorState["values"], value: string) => {
    setEditor((prev) => (prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev));
  };

  const handleSave = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      const result = await saveGuideAction({ characterId: editor.characterId, ...editor.values });
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      MessagePlugin.success(result.message);
      setEditor(null);
      await refresh();
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const preview = (text: string) => (text ? text.slice(0, 26) + (text.length > 26 ? "…" : "") : "（空）");

  // ⚠️ 列的类型要与 data 的行类型一致（PrimaryTableCol<GuideRow>[] ✓）——
  //   写成默认的 TableRowData 会让 cell 里的 row 丢掉业务字段，tsc 直接报错 ✗（2026-10-13 踩到 ✓）
  const columns: PrimaryTableCol<GuideRow>[] = [
    {
      colKey: "name",
      title: "角色",
      width: 150,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800">{row.name}</span>
          <span className="text-xs text-slate-400">ID {row.characterId}</span>
        </div>
      ),
    },
    { colKey: "teamPick", title: "配队思路", ellipsis: true, cell: ({ row }) => preview(row.teamPick) },
    { colKey: "graduation", title: "毕业线", ellipsis: true, cell: ({ row }) => preview(row.graduation) },
    { colKey: "talents", title: "天赋顺序", ellipsis: true, cell: ({ row }) => preview(row.talents) },
    {
      colKey: "size",
      title: "字数（定位/天赋/武器/圣遗物/配队/毕业/注意）",
      width: 260,
      cell: ({ row }) =>
        [row.role, row.talents, row.weaponPick, row.relicPick, row.teamPick, row.graduation, row.notes]
          .map((text) => text.length)
          .join(" / "),
    },
    {
      colKey: "teamFrom",
      title: "配队来源",
      width: 110,
      cell: ({ row }) =>
        row.teamFrom === "reverse" ? (
          <Tag theme="warning" variant="light">
            反向索引
          </Tag>
        ) : (
          <Tag theme="success" variant="light">
            本页原文
          </Tag>
        ),
    },
    {
      colKey: "updatedAt",
      title: "最近更新",
      width: 170,
      cell: ({ row }) => (row.updatedAt ? new Date(row.updatedAt).toLocaleString("zh-CN") : "-"),
    },
    {
      colKey: "op",
      title: "操作",
      width: 90,
      cell: ({ row }) => (
        <Button size="small" variant="text" onClick={() => openEditor(row)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">角色攻略卡</h3>
            <p className="mt-1 text-sm text-slate-500">
              派蒙回答「配队思路 / 毕业线 / 天赋顺序」时**只依据这张表** ✓ —— 这里改完**立即生效**（主服务每问直查库 ✓，不用 reload、不用发版 ✓）。
            </p>
            <p className="mt-1 text-xs text-slate-400">
              ⚠️ 主/副词条**不在这里维护** ✗（归「资产映射管理 → 推荐属性」，那边能分级、能参与评分 ✓）；人工订正后在攻略页**真的更新**时重跑导入会整行覆盖 ✓。
            </p>
          </div>
          <Space>
            <Tag variant="light">共 {rows.length} 张</Tag>
            <Button size="small" variant="outline" loading={loading} onClick={() => void refresh()}>
              刷新
            </Button>
          </Space>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Table
          rowKey="characterId"
          data={rows}
          columns={columns}
          size="small"
          hover
          stripe
          loading={loading}
          empty="还没有攻略卡 —— 先在服务端跑 go run ./cmd/guideimport 导入 ✓"
        />
      </div>

      <Dialog
        header={editor ? `编辑攻略卡：${editor.name}（ID ${editor.characterId}）` : ""}
        visible={Boolean(editor)}
        onClose={() => setEditor(null)}
        onConfirm={handleSave}
        confirmBtn={{ content: "保存", loading: saving }}
        width={760}
      >
        {editor && (
          <div className="space-y-4 pt-2">
            {editor.teamFrom === "reverse" && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                这张卡的配队来自**反向索引**（该角色自己的攻略页没写配队，是别的角色攻略页把它列为队友 ⇒ 反推出来的 ✓）——
                人工补写更准的配队说明也没问题 ✓
              </p>
            )}
            {TEXT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {field.label}
                  <span className="ml-2 text-xs font-normal text-slate-400">{editor.values[field.key].length} 字</span>
                </label>
                <Textarea
                  value={editor.values[field.key]}
                  onChange={(value) => setField(field.key, String(value))}
                  autosize={{ minRows: field.rows[0], maxRows: field.rows[1] }}
                  placeholder={field.hint}
                />
              </div>
            ))}

            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              <p className="font-medium text-slate-600">来源（只读 ✓ —— 不会进派蒙的回答，仅供后台核对 ✓）</p>
              <p className="mt-1 break-all">{editor.sourceUrl || "（无）"}</p>
              <p className="mt-0.5">
                版本 rev {editor.sourceRev || "-"} ／ 抓取于{" "}
                {editor.fetchedAt ? new Date(editor.fetchedAt).toLocaleString("zh-CN") : "-"}
              </p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
