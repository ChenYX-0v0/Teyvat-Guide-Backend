"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dialog, Input, MessagePlugin, Select, Space, Table, Tabs, Tag, Textarea } from "tdesign-react";
import type { PrimaryTableCol, TableRowData } from "tdesign-react/es/table/type";
import {
  loadAssetsAction,
  removeCharacterAction,
  removeRelicSetAction,
  removeRelicSetEffectsAction,
  removeWeaponAction,
  saveCharacterAction,
  saveRelicSetAction,
  saveRelicSetEffectsAction,
  saveWeaponAction,
  type AssetsData,
  type CharacterRow,
  type RelicSetRow,
  type WeaponRow,
} from "./asset-actions";
import { StatWeightDialog } from "./StatWeightDialog";
import { ScoreStandardDialog } from "./ScoreStandardDialog";

const { TabPanel } = Tabs;

const ELEMENT_OPTIONS = ["冰", "水", "火", "雷", "风", "岩", "草"].map((v) => ({ label: v, value: v }));
const WEAPON_TYPE_OPTIONS = ["单手剑", "弓", "法器", "长柄武器", "双手剑"].map((v) => ({ label: v, value: v }));
const RARITY_OPTIONS = [1, 2, 3, 4, 5].map((v) => ({ label: `${v} 星`, value: v }));

type Kind = "character" | "weapon" | "relicSet" | "relicSetEffect";

type EditorState = {
  kind: Kind;
  mode: "create" | "edit";
  values: Record<string, string | number>;
};

/** 套装效果：一行 = 一个套装的 2/4 件文本（由 relicSetEffects 聚合而来） */
type EffectRow = {
  setId: number;
  name: string;
  piece2: string;
  piece4: string;
  source: string;
  /** 来源里带「待核对」标记 = 还是草稿（页签支持只筛这些） */
  pending: boolean;
};

type EffectEditorState = {
  mode: "create" | "edit";
  setId: number | "";
  piece2: string;
  piece4: string;
  source: string;
};

/** 来源里带这个标记即"草稿待核对" */
const PENDING_MARK = "待核对";
const DEFAULT_SOURCE = "官方资料整理·待核对";
/** 一键切换来源（核对前 / 核对后），省得手打 */
const SOURCE_PRESETS = ["官方资料整理·待核对", "官方资料·已核对"];

function rarityStars(rarity: number) {
  return <span className="text-amber-500">{"★".repeat(Math.max(1, Math.min(5, rarity)))}</span>;
}

function elementTag(element: string) {
  const themeMap: Record<string, "primary" | "success" | "warning" | "danger" | "default"> = {
    冰: "primary",
    水: "primary",
    火: "danger",
    雷: "warning",
    风: "success",
    岩: "warning",
    草: "success",
  };
  return <Tag theme={themeMap[element] ?? "default"} variant="light">{element}</Tag>;
}

export function AssetMappingPanel({ initialData }: { initialData: AssetsData }) {
  const [data, setData] = useState<AssetsData>(initialData);
  const [activeTab, setActiveTab] = useState<string>("character");
  const [keyword, setKeyword] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ kind: Kind; id: number; label: string } | null>(null);
  const [statWeightTarget, setStatWeightTarget] = useState<CharacterRow | null>(null);
  const [scoreStandardTarget, setScoreStandardTarget] = useState<CharacterRow | null>(null);
  const [effectEditor, setEffectEditor] = useState<EffectEditorState | null>(null);
  const [effectPendingOnly, setEffectPendingOnly] = useState(false);

  const refresh = useCallback(async () => {
    const next = await loadAssetsAction();
    setData(next);
  }, []);

  // 切换 Tab 时清空搜索
  useEffect(() => {
    setKeyword("");
  }, [activeTab]);

  const filteredCharacters = useMemo(
    () =>
      data.characters.filter(
        (c) => !keyword || c.name.includes(keyword) || c.enName.toLowerCase().includes(keyword.toLowerCase()) || String(c.id).includes(keyword),
      ),
    [data.characters, keyword],
  );
  const filteredWeapons = useMemo(
    () =>
      data.weapons.filter(
        (w) => !keyword || w.name.includes(keyword) || w.enName.toLowerCase().includes(keyword.toLowerCase()) || String(w.id).includes(keyword),
      ),
    [data.weapons, keyword],
  );
  const filteredRelicSets = useMemo(
    () => data.relicSets.filter((r) => !keyword || r.name.includes(keyword) || String(r.setId).includes(keyword)),
    [data.relicSets, keyword],
  );

  const relicSetNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const set of data.relicSets) map.set(set.setId, set.name);
    return map;
  }, [data.relicSets]);

  // 套装效果按套装聚合成一行（2/4 件套并排），核对时能一眼对照
  const effectRows = useMemo<EffectRow[]>(() => {
    const bySet = new Map<number, EffectRow>();
    for (const item of data.relicSetEffects) {
      let row = bySet.get(item.setId);
      if (!row) {
        row = {
          setId: item.setId,
          name: relicSetNameById.get(item.setId) ?? "",
          piece2: "",
          piece4: "",
          source: "",
          pending: false,
        };
        bySet.set(item.setId, row);
      }
      if (item.piece === 2) row.piece2 = item.effect;
      if (item.piece === 4) row.piece4 = item.effect;
      if (item.source) row.source = item.source;
      if (item.source.includes(PENDING_MARK)) row.pending = true;
    }
    return [...bySet.values()].sort((a, b) => a.setId - b.setId);
  }, [data.relicSetEffects, relicSetNameById]);

  const effectBySet = useMemo(() => new Map(effectRows.map((row) => [row.setId, row])), [effectRows]);

  const filteredEffectRows = useMemo(
    () =>
      effectRows.filter((row) => {
        if (effectPendingOnly && !row.pending) return false;
        if (!keyword) return true;
        return (
          row.name.includes(keyword) ||
          String(row.setId).includes(keyword) ||
          row.piece2.includes(keyword) ||
          row.piece4.includes(keyword)
        );
      }),
    [effectRows, effectPendingOnly, keyword],
  );

  const pendingEffectCount = useMemo(() => effectRows.filter((row) => row.pending).length, [effectRows]);

  const openCreate = useCallback((kind: Kind) => {
    const values: Record<string, string | number> =
      kind === "character"
        ? { id: "", name: "", enName: "", element: "冰", rarity: 5, icon: "" }
        : kind === "weapon"
          ? { id: "", name: "", enName: "", rarity: 5, type: "单手剑", icon: "" }
          : { setId: "", name: "", icon: "" };
    setEditor({ kind, mode: "create", values });
  }, []);

  const openEdit = useCallback((kind: Kind, row: CharacterRow | WeaponRow | RelicSetRow) => {
    if (kind === "character") {
      const c = row as CharacterRow;
      setEditor({ kind, mode: "edit", values: { id: c.id, name: c.name, enName: c.enName, element: c.element, rarity: c.rarity, icon: c.icon } });
    } else if (kind === "weapon") {
      const w = row as WeaponRow;
      setEditor({ kind, mode: "edit", values: { id: w.id, name: w.name, enName: w.enName, rarity: w.rarity, type: w.type, icon: w.icon } });
    } else {
      const r = row as RelicSetRow;
      setEditor({ kind, mode: "edit", values: { setId: r.setId, name: r.name, icon: r.icon } });
    }
  }, []);

  const setField = useCallback((key: string, value: string | number) => {
    setEditor((prev) => (prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev));
  }, []);

  const openEffectEdit = useCallback((row?: EffectRow) => {
    setEffectEditor(
      row
        ? { mode: "edit", setId: row.setId, piece2: row.piece2, piece4: row.piece4, source: row.source || DEFAULT_SOURCE }
        : { mode: "create", setId: "", piece2: "", piece4: "", source: DEFAULT_SOURCE },
    );
  }, []);

  const setEffectField = useCallback((key: "setId" | "piece2" | "piece4" | "source", value: string | number) => {
    setEffectEditor((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const handleEffectSave = useCallback(async () => {
    if (!effectEditor) return;
    if (!effectEditor.setId) {
      MessagePlugin.error("请先选择要维护的套装");
      return;
    }
    if (!effectEditor.piece2.trim() && !effectEditor.piece4.trim()) {
      MessagePlugin.error("2 件套与 4 件套至少填一条；想清空该套装请用列表里的「删除」");
      return;
    }
    setSaving(true);
    try {
      const result = await saveRelicSetEffectsAction(
        Number(effectEditor.setId),
        { piece2: effectEditor.piece2, piece4: effectEditor.piece4 },
        effectEditor.source.trim() || DEFAULT_SOURCE,
      );
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      MessagePlugin.success(`已保存套装效果——${result.message}`);
      setEffectEditor(null);
      await refresh();
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [effectEditor, refresh]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    const v = editor.values;
    setSaving(true);
    try {
      let result;
      if (editor.kind === "character") {
        if (!v.id || !v.name) throw new Error("请填写角色 ID 与名称");
        result = await saveCharacterAction({ id: Number(v.id), name: String(v.name), enName: String(v.enName), element: String(v.element), rarity: Number(v.rarity), icon: String(v.icon) });
      } else if (editor.kind === "weapon") {
        if (!v.id || !v.name) throw new Error("请填写武器 ID 与名称");
        result = await saveWeaponAction({ id: Number(v.id), name: String(v.name), enName: String(v.enName), rarity: Number(v.rarity), type: String(v.type), icon: String(v.icon) });
      } else {
        if (!v.setId || !v.name) throw new Error("请填写套装 ID 与名称");
        result = await saveRelicSetAction({ setId: Number(v.setId), name: String(v.name), icon: String(v.icon) });
      }
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
  }, [editor, refresh]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    const result =
      target.kind === "character"
        ? await removeCharacterAction(target.id)
        : target.kind === "weapon"
          ? await removeWeaponAction(target.id)
          : target.kind === "relicSet"
            ? await removeRelicSetAction(target.id)
            : await removeRelicSetEffectsAction(target.id);
    if (!result.success) {
      MessagePlugin.error(result.message);
      return;
    }
    MessagePlugin.success(result.message);
    await refresh();
  }, [pendingDelete, refresh]);

  const actionColumn = useCallback(
    (kind: Kind) => ({
      colKey: "actions",
      title: "操作",
      width: 140,
      cell: ({ row }: { row: TableRowData }) => (
        <Space size={8}>
          <Button size="small" variant="text" theme="primary" onClick={() => openEdit(kind, row as CharacterRow)}>
            编辑
          </Button>
          <Button
            size="small"
            variant="text"
            theme="danger"
            onClick={() =>
              setPendingDelete({
                kind,
                id: Number(kind === "relicSet" ? (row as unknown as RelicSetRow).setId : (row as unknown as CharacterRow).id),
                label: String((row as unknown as { name: string }).name),
              })
            }
          >
            删除
          </Button>
        </Space>
      ),
    }),
    [openEdit],
  );

  const characterColumns = useMemo<PrimaryTableCol<CharacterRow>[]>(
    () => [
      { colKey: "id", title: "ID", width: 120 },
      { colKey: "name", title: "中文名", width: 120 },
      { colKey: "enName", title: "英文名", width: 140 },
      { colKey: "element", title: "元素", width: 90, cell: ({ row }) => elementTag(row.element) },
      { colKey: "rarity", title: "星级", width: 100, cell: ({ row }) => rarityStars(row.rarity) },
      {
        colKey: "statWeight",
        title: "推荐属性",
        width: 110,
        cell: ({ row }) =>
          data.statWeights[row.id] ? (
            <Tag theme="success" variant="light">已配置</Tag>
          ) : (
            <Tag variant="light">未配置</Tag>
          ),
      },
      { colKey: "icon", title: "图标", ellipsis: true },
      {
        colKey: "actions",
        title: "操作",
        width: 280,
        cell: ({ row }) => (
          <Space size={4}>
            <Button size="small" variant="text" theme="primary" onClick={() => openEdit("character", row)}>
              编辑
            </Button>
            <Button size="small" variant="text" theme="primary" onClick={() => setStatWeightTarget(row)}>
              推荐属性
            </Button>
            <Button size="small" variant="text" theme="primary" onClick={() => setScoreStandardTarget(row)}>
              评分标准
            </Button>
            <Button
              size="small"
              variant="text"
              theme="danger"
              onClick={() => setPendingDelete({ kind: "character", id: row.id, label: row.name })}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [data.statWeights, openEdit],
  );

  const weaponColumns = useMemo<PrimaryTableCol<WeaponRow>[]>(
    () => [
      { colKey: "id", title: "ID", width: 120 },
      { colKey: "name", title: "中文名", width: 140 },
      { colKey: "enName", title: "英文名", width: 160 },
      { colKey: "type", title: "类型", width: 120 },
      { colKey: "rarity", title: "星级", width: 110, cell: ({ row }) => rarityStars(row.rarity) },
      { colKey: "icon", title: "图标", ellipsis: true },
      actionColumn("weapon") as PrimaryTableCol<WeaponRow>,
    ],
    [actionColumn],
  );

  const relicSetColumns = useMemo<PrimaryTableCol<RelicSetRow>[]>(
    () => [
      { colKey: "setId", title: "套装 ID", width: 140 },
      { colKey: "name", title: "名称", width: 200 },
      {
        colKey: "effect",
        title: "套装效果",
        width: 120,
        cell: ({ row }) =>
          effectBySet.get(row.setId) ? (
            <Tag theme="success" variant="light">已配置</Tag>
          ) : (
            <Tag variant="light">未配置</Tag>
          ),
      },
      { colKey: "icon", title: "图标", ellipsis: true },
      {
        colKey: "actions",
        title: "操作",
        width: 220,
        cell: ({ row }) => (
          <Space size={4}>
            <Button size="small" variant="text" theme="primary" onClick={() => openEdit("relicSet", row)}>
              编辑
            </Button>
            <Button
              size="small"
              variant="text"
              theme="primary"
              onClick={() =>
                openEffectEdit(
                  effectBySet.get(row.setId) ?? {
                    setId: row.setId,
                    name: row.name,
                    piece2: "",
                    piece4: "",
                    source: DEFAULT_SOURCE,
                    pending: false,
                  },
                )
              }
            >
              套装效果
            </Button>
            <Button
              size="small"
              variant="text"
              theme="danger"
              onClick={() => setPendingDelete({ kind: "relicSet", id: row.setId, label: row.name })}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [effectBySet, openEdit, openEffectEdit],
  );

  const effectColumns = useMemo<PrimaryTableCol<EffectRow>[]>(
    () => [
      { colKey: "setId", title: "套装 ID", width: 110 },
      {
        colKey: "name",
        title: "名称",
        width: 170,
        cell: ({ row }) => (row.name ? row.name : <span className="text-slate-300">不在套装表</span>),
      },
      { colKey: "piece2", title: "2 件套", width: 240, ellipsis: true },
      { colKey: "piece4", title: "4 件套", ellipsis: true },
      {
        colKey: "source",
        title: "来源 / 核对状态",
        width: 170,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            {row.pending ? (
              <Tag theme="warning" variant="light">待核对</Tag>
            ) : (
              <Tag theme="success" variant="light">已核对</Tag>
            )}
            <span className="text-xs text-slate-400">{row.source}</span>
          </div>
        ),
      },
      {
        colKey: "actions",
        title: "操作",
        width: 130,
        cell: ({ row }) => (
          <Space size={8}>
            <Button size="small" variant="text" theme="primary" onClick={() => openEffectEdit(row)}>
              编辑
            </Button>
            <Button
              size="small"
              variant="text"
              theme="danger"
              onClick={() => setPendingDelete({ kind: "relicSetEffect", id: row.setId, label: row.name || `套装 ${row.setId}` })}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [openEffectEdit],
  );

  const toolbar = (kind: Kind, count: number, label: string) => (
    <div className="mb-4 flex items-center justify-between gap-4">
      <Input
        value={keyword}
        onChange={(value) => setKeyword(String(value))}
        placeholder="搜索名称 / ID"
        clearable
        style={{ maxWidth: 280 }}
      />
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">共 {count} 条</span>
        <Button theme="primary" onClick={() => openCreate(kind)}>
          新增{label}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900">资产映射管理</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            直连 teyvat_guide 库维护角色 / 武器 / 圣遗物映射与套装效果；保存后自动刷新内存并清空档案快照。
          </p>
        </div>

        <Tabs value={activeTab} onChange={(val) => setActiveTab(String(val))} theme="card">
          <TabPanel value="character" label={`角色（${data.characters.length}）`}>
            <div className="pt-4">
              {toolbar("character", filteredCharacters.length, "角色")}
              <Table rowKey="id" data={filteredCharacters} columns={characterColumns} size="small" hover stripe empty="暂无数据" />
            </div>
          </TabPanel>
          <TabPanel value="weapon" label={`武器（${data.weapons.length}）`}>
            <div className="pt-4">
              {toolbar("weapon", filteredWeapons.length, "武器")}
              <Table rowKey="id" data={filteredWeapons} columns={weaponColumns} size="small" hover stripe empty="暂无数据" />
            </div>
          </TabPanel>
          <TabPanel value="relicSet" label={`圣遗物（${data.relicSets.length}）`}>
            <div className="pt-4">
              {toolbar("relicSet", filteredRelicSets.length, "套装")}
              <Table rowKey="setId" data={filteredRelicSets} columns={relicSetColumns} size="small" hover stripe empty="暂无数据" />
            </div>
          </TabPanel>
          <TabPanel value="relicSetEffect" label={`套装效果（${effectRows.length}）`}>
            <div className="pt-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Input
                    value={keyword}
                    onChange={(value) => setKeyword(String(value))}
                    placeholder="搜索套装名 / ID / 效果文本"
                    clearable
                    style={{ maxWidth: 280 }}
                  />
                  <Select
                    value={effectPendingOnly ? "pending" : "all"}
                    onChange={(value) => setEffectPendingOnly(String(value) === "pending")}
                    options={[
                      { label: "全部", value: "all" },
                      { label: "仅待核对", value: "pending" },
                    ]}
                    style={{ width: 130 }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    共 {effectRows.length} 套 / 待核对 {pendingEffectCount} 套
                  </span>
                  <Button theme="primary" onClick={() => openEffectEdit()}>
                    新增套装效果
                  </Button>
                </div>
              </div>
              <p className="mb-3 text-xs text-slate-400">
                这里填的文本会被 AI 当作「本回合数值与词条的唯一依据」注入回答；某个件数留空 = 删掉那条，
                AI 会如实回答「本服暂无该套装的效果资料」（比留一条记错的强）。核对完把来源改成「官方资料·已核对」。
              </p>
              <Table rowKey="setId" data={filteredEffectRows} columns={effectColumns} size="small" hover stripe empty="暂无数据" />
            </div>
          </TabPanel>
        </Tabs>
      </div>

      <Dialog
        header={editor ? `${editor.mode === "create" ? "新增" : "编辑"}${editor.kind === "character" ? "角色" : editor.kind === "weapon" ? "武器" : "圣遗物套装"}` : ""}
        visible={Boolean(editor)}
        onClose={() => setEditor(null)}
        onConfirm={handleSave}
        confirmBtn={{ content: "保存", loading: saving }}
      >
        {editor && (
          <div className="space-y-4 pt-2">
            {editor.kind === "character" && (
              <>
                <Field label="角色 ID（avatarId）">
                  <Input
                    value={String(editor.values.id ?? "")}
                    onChange={(value) => setField("id", String(value).replace(/\D/g, ""))}
                    disabled={editor.mode === "edit"}
                    placeholder="如 10000002"
                  />
                </Field>
                <Field label="中文名">
                  <Input value={String(editor.values.name ?? "")} onChange={(value) => setField("name", String(value))} />
                </Field>
                <Field label="英文名">
                  <Input value={String(editor.values.enName ?? "")} onChange={(value) => setField("enName", String(value))} />
                </Field>
                <Field label="元素">
                  <Select value={editor.values.element} onChange={(value) => setField("element", String(value))} options={ELEMENT_OPTIONS} />
                </Field>
                <Field label="星级">
                  <Select value={editor.values.rarity} onChange={(value) => setField("rarity", Number(value))} options={RARITY_OPTIONS} />
                </Field>
                <Field label="图标（UI_AvatarIcon_XXX）">
                  <Input value={String(editor.values.icon ?? "")} onChange={(value) => setField("icon", String(value))} />
                </Field>
              </>
            )}

            {editor.kind === "weapon" && (
              <>
                <Field label="武器 ID（weaponId）">
                  <Input
                    value={String(editor.values.id ?? "")}
                    onChange={(value) => setField("id", String(value).replace(/\D/g, ""))}
                    disabled={editor.mode === "edit"}
                    placeholder="如 11101"
                  />
                </Field>
                <Field label="中文名">
                  <Input value={String(editor.values.name ?? "")} onChange={(value) => setField("name", String(value))} />
                </Field>
                <Field label="英文名">
                  <Input value={String(editor.values.enName ?? "")} onChange={(value) => setField("enName", String(value))} />
                </Field>
                <Field label="类型">
                  <Select value={editor.values.type} onChange={(value) => setField("type", String(value))} options={WEAPON_TYPE_OPTIONS} />
                </Field>
                <Field label="星级">
                  <Select value={editor.values.rarity} onChange={(value) => setField("rarity", Number(value))} options={RARITY_OPTIONS} />
                </Field>
                <Field label="图标（UI_EquipIcon_XXX）">
                  <Input value={String(editor.values.icon ?? "")} onChange={(value) => setField("icon", String(value))} />
                </Field>
              </>
            )}

            {editor.kind === "relicSet" && (
              <>
                <Field label="套装 ID（setId）">
                  <Input
                    value={String(editor.values.setId ?? "")}
                    onChange={(value) => setField("setId", String(value).replace(/\D/g, ""))}
                    disabled={editor.mode === "edit"}
                    placeholder="如 10001"
                  />
                </Field>
                <Field label="名称">
                  <Input value={String(editor.values.name ?? "")} onChange={(value) => setField("name", String(value))} />
                </Field>
                <Field label="图标">
                  <Input value={String(editor.values.icon ?? "")} onChange={(value) => setField("icon", String(value))} />
                </Field>
              </>
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        header="确认删除"
        visible={Boolean(pendingDelete)}
        theme="warning"
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        confirmBtn={{ theme: "danger", content: "删除" }}
      >
        <p>确定删除「{pendingDelete?.label}」（ID: {pendingDelete?.id}）吗？删除后需刷新内存生效。</p>
      </Dialog>

      <Dialog
        header={effectEditor ? `${effectEditor.mode === "create" ? "新增" : "编辑"}套装效果` : ""}
        visible={Boolean(effectEditor)}
        onClose={() => setEffectEditor(null)}
        onConfirm={handleEffectSave}
        confirmBtn={{ content: "保存", loading: saving }}
        width={720}
      >
        {effectEditor && (
          <div className="space-y-4 pt-2">
            <Field label="套装">
              {effectEditor.mode === "create" ? (
                <Select
                  value={effectEditor.setId === "" ? undefined : effectEditor.setId}
                  onChange={(value) => setEffectField("setId", Number(value))}
                  options={data.relicSets.map((set) => ({ label: `${set.name}（${set.setId}）`, value: set.setId }))}
                  filterable
                  placeholder="选择要维护效果的套装"
                />
              ) : (
                <div className="text-sm text-slate-700">
                  {effectEditor.setId === "" ? "" : relicSetNameById.get(Number(effectEditor.setId)) ?? `套装 ${effectEditor.setId}`}
                  <span className="ml-2 text-xs text-slate-400">ID {effectEditor.setId}</span>
                </div>
              )}
            </Field>
            <Field label="2 件套效果">
              <Textarea
                value={effectEditor.piece2}
                onChange={(value) => setEffectField("piece2", String(value))}
                autosize={{ minRows: 2, maxRows: 4 }}
                placeholder="如：元素充能效率提高20%。"
              />
            </Field>
            <Field label="4 件套效果">
              <Textarea
                value={effectEditor.piece4}
                onChange={(value) => setEffectField("piece4", String(value))}
                autosize={{ minRows: 3, maxRows: 10 }}
                placeholder="如：基于元素充能效率的25%，提高元素爆发造成的伤害……"
              />
            </Field>
            <Field label="来源 / 核对状态">
              <Input
                value={effectEditor.source}
                onChange={(value) => setEffectField("source", String(value))}
                placeholder="如：官方资料整理·待核对"
              />
              <Space size={4} breakLine className="mt-2">
                {SOURCE_PRESETS.map((preset) => (
                  <Button key={preset} size="small" variant="outline" onClick={() => setEffectField("source", preset)}>
                    {preset}
                  </Button>
                ))}
              </Space>
              <p className="mt-1.5 text-xs text-slate-400">
                来源里带「待核对」的条目会被列表的「仅待核对」筛出来——那就是还没核对完的草稿。
              </p>
            </Field>
          </div>
        )}
      </Dialog>

      {statWeightTarget && (
        <StatWeightDialog
          characterId={statWeightTarget.id}
          characterName={statWeightTarget.name}
          initial={data.statWeights[statWeightTarget.id] ?? null}
          propMaps={data.propMaps}
          onClose={(saved) => {
            setStatWeightTarget(null);
            if (saved) refresh();
          }}
        />
      )}

      {scoreStandardTarget && (
        <ScoreStandardDialog
          characterId={scoreStandardTarget.id}
          characterName={scoreStandardTarget.name}
          rows={data.relicWeightsMp}
          rules={data.relicWeightRules}
          onClose={() => setScoreStandardTarget(null)}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
