"use client";

import { useMemo, useState } from "react";
import { Button, Dialog, Input, MessagePlugin, Radio, Select } from "tdesign-react";
import { AddIcon, DeleteIcon } from "tdesign-icons-react";
import { saveCharacterStatWeightAction, type PropMapRow } from "./asset-actions";
import {
  RELIC_SCORE_DIMS,
  type RelicScorePayload,
  type StatWeightEntry,
  type StatWeightPayload,
  type StatWeightTier,
} from "@/lib/teyvat/entities";

const TIER_OPTIONS = [
  { label: "主要（金色）", value: "primary" },
  { label: "次要（白色）", value: "secondary" },
  { label: "未分级", value: "" },
];

const ELEMENT_OPTIONS = ["风", "岩", "雷", "草", "水", "火", "冰"].map((v) => ({ label: v, value: v }));

const EMPTY_MAIN_STATS = { sand: "", goblet: "", circlet: "" };

/**
 * 「推荐属性」——角色推荐词条（副词条 + 三主词条）**与评分权重**。
 *
 * 2026-09-27 合并（用户决定）：评分权重写在推荐属性里，不再单独一个页面/一张表 ✓
 *   · 评分权重 = 小助手口径 **7 维**，key 与推荐词条的 `statKey` 同一批 `FIGHT_PROP_*` ✓（"用 key 对齐"）
 *   · 旅行者**按元素当不同角色算** ⇒ 每个元素形态一套权重（`score.byElement`），另有「通用」兜底 ✓
 *   · 保存时会把 `score` 一起写回 —— 旧版本只发 `subStats/mainStats`，会把评分权重抹掉 ✗（已修 ✓）
 */
export function StatWeightDialog({
  characterId,
  characterName,
  initial,
  propMaps,
  onClose,
}: {
  characterId: number;
  characterName: string;
  initial: StatWeightPayload | null;
  propMaps: PropMapRow[];
  onClose: (saved: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [subStats, setSubStats] = useState<Array<{ statKey: string; weight: number; tier: StatWeightTier | "" }>>(
    () => (initial?.subStats ?? []).map((s) => ({ statKey: s.statKey, weight: s.weight, tier: s.tier ?? "" })),
  );
  const [mainStats, setMainStats] = useState(() => ({
    sand: initial?.mainStats?.sand ?? EMPTY_MAIN_STATS.sand,
    goblet: initial?.mainStats?.goblet ?? EMPTY_MAIN_STATS.goblet,
    circlet: initial?.mainStats?.circlet ?? EMPTY_MAIN_STATS.circlet,
  }));
  // 评分权重：通用 dims + 各元素形态
  const [dims, setDims] = useState<Record<string, number>>(() => ({ ...(initial?.score?.dims ?? {}) }));
  const [byElement, setByElement] = useState<Record<string, Record<string, number>>>(() => ({ ...(initial?.score?.byElement ?? {}) }));
  const [tab, setTab] = useState<string>(""); // "" = 通用
  const [pendingElement, setPendingElement] = useState<string>("");

  const propOptions = useMemo(
    () => propMaps.map((p) => ({ label: `${p.name}（${p.propId}）`, value: p.propId })),
    [propMaps],
  );

  const elementKeys = useMemo(() => Object.keys(byElement), [byElement]);
  const addableElements = ELEMENT_OPTIONS.filter((o) => !elementKeys.includes(o.value));

  const currentDims = tab === "" ? dims : (byElement[tab] ?? {});
  const setCurrentDim = (propId: string, value: number) => {
    if (tab === "") {
      setDims((d) => ({ ...d, [propId]: value }));
    } else {
      setByElement((m) => ({ ...m, [tab]: { ...(m[tab] ?? {}), [propId]: value } }));
    }
  };

  const updateRow = (index: number, patch: Partial<{ statKey: string; weight: number; tier: StatWeightTier | "" }>) => {
    setSubStats((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const addRow = () => setSubStats((rows) => [...rows, { statKey: "", weight: 1, tier: "" }]);
  const removeRow = (index: number) => setSubStats((rows) => rows.filter((_, i) => i !== index));

  const handleSave = async () => {
    const cleaned: StatWeightEntry[] = subStats
      .filter((row) => row.statKey)
      .map((row) =>
        row.tier
          ? { statKey: row.statKey, weight: Number(row.weight) || 0, tier: row.tier }
          : { statKey: row.statKey, weight: Number(row.weight) || 0 },
      );
    if (cleaned.length === 0 && !mainStats.sand && !mainStats.goblet && !mainStats.circlet) {
      MessagePlugin.warning("请至少配置一条副词条或一项主词条");
      return;
    }
    // ⚠️ 一定要带上 score（含各元素形态）—— 否则会把评分权重整块删掉 ✗
    const score: RelicScorePayload = {};
    if (Object.keys(dims).length > 0) score.dims = dims;
    if (elementKeys.length > 0) score.byElement = byElement;
    const payload: StatWeightPayload = {
      ...(initial ?? { subStats: [], mainStats: EMPTY_MAIN_STATS }),
      subStats: cleaned,
      mainStats,
      ...(score.dims || score.byElement ? { score } : {}),
    };
    setSaving(true);
    try {
      const result = await saveCharacterStatWeightAction(characterId, payload);
      if (!result.success) {
        MessagePlugin.error(result.message);
        return;
      }
      MessagePlugin.success(result.message);
      onClose(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      header={`推荐属性 · ${characterName}`}
      visible
      width={780}
      onClose={() => onClose(false)}
      onConfirm={handleSave}
      confirmBtn={{ content: "保存", loading: saving }}
    >
      <div className="space-y-6 pt-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">副词条推荐</p>
              <p className="mt-0.5 text-xs text-slate-400">权重越大越优先；分级驱动前端着色：主要显示金色，次要显示白色。</p>
            </div>
            <Button size="small" variant="outline" icon={<AddIcon />} onClick={addRow}>
              添加词条
            </Button>
          </div>
          <div className="space-y-2">
            {subStats.length === 0 && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">暂未配置副词条</p>}
            {subStats.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={row.statKey}
                    onChange={(value) => updateRow(index, { statKey: String(value) })}
                    options={propOptions}
                    placeholder="选择词条"
                    filterable
                  />
                </div>
                <div className="w-24">
                  <Input
                    value={String(row.weight)}
                    onChange={(value) => updateRow(index, { weight: Number(String(value).replace(/\D/g, "")) })}
                    placeholder="权重"
                  />
                </div>
                <div className="w-36">
                  <Select
                    value={row.tier}
                    onChange={(value) => updateRow(index, { tier: String(value) as StatWeightTier | "" })}
                    options={TIER_OPTIONS}
                  />
                </div>
                <Button size="small" variant="text" theme="danger" icon={<DeleteIcon />} onClick={() => removeRow(index)} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">主词条推荐</p>
          <div className="grid grid-cols-3 gap-3">
            {(["sand", "goblet", "circlet"] as const).map((slot) => (
              <div key={slot}>
                <p className="mb-1 text-xs text-slate-400">{{ sand: "时之沙", goblet: "空之杯", circlet: "理之冠" }[slot]}</p>
                <Input
                  value={mainStats[slot]}
                  onChange={(value) => setMainStats((m) => ({ ...m, [slot]: String(value) }))}
                  placeholder="可留空"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── 评分权重（2026-09-27 并入本弹窗：一份数据一个地方 ✓）── */}
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2">
            <p className="text-sm font-medium text-slate-700">评分权重（小助手口径 7 维，0~100）</p>
            <p className="mt-0.5 text-xs text-slate-400">
              0 = 该角色不吃这一维。key 与上面的推荐词条是同一批（FIGHT_PROP_*）✓；
              <b>旅行者按元素当不同角色算</b> ⇒ 每个形态一套，另有「通用」兜底。
            </p>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Radio.Group value={tab} onChange={(v) => setTab(String(v))} variant="default-filled" size="small">
              <Radio.Button value="">通用</Radio.Button>
              {elementKeys.map((e) => (
                <Radio.Button key={e} value={e}>
                  {e}
                </Radio.Button>
              ))}
            </Radio.Group>
            {addableElements.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-32">
                  <Select
                    size="small"
                    value={pendingElement}
                    onChange={(v) => setPendingElement(String(v))}
                    options={addableElements}
                    placeholder="添加元素形态"
                  />
                </div>
                <Button
                  size="small"
                  variant="outline"
                  disabled={!pendingElement}
                  onClick={() => {
                    setByElement((m) => ({ ...m, [pendingElement]: { ...dims } }));
                    setTab(pendingElement);
                    setPendingElement("");
                  }}
                >
                  添加
                </Button>
              </div>
            )}
            {tab !== "" && (
              <Button
                size="small"
                variant="text"
                theme="danger"
                onClick={() => {
                  setByElement((m) => {
                    const next = { ...m };
                    delete next[tab];
                    return next;
                  });
                  setTab("");
                }}
              >
                删除「{tab}」形态
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {RELIC_SCORE_DIMS.map((d) => (
              <div key={d.propId} className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-xs text-slate-500">{d.label}</span>
                <div className="w-24">
                  <Input
                    size="small"
                    value={String(currentDims[d.propId] ?? "")}
                    onChange={(value) => {
                      const raw = String(value).replace(/\D/g, "");
                      const num = raw === "" ? 0 : Math.min(100, Number(raw));
                      setCurrentDim(d.propId, num);
                    }}
                    placeholder="0"
                  />
                </div>
                <span className="truncate text-[11px] text-slate-300">{d.propId}</span>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-slate-400">
            {tab === "" ? "当前编辑：通用（所有元素形态的兜底）" : `当前编辑：${tab}主`}
          </p>
        </div>
      </div>
    </Dialog>
  );
}
