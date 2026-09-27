"use client";

import { useMemo, useState } from "react";
import { Button, Dialog, Input, MessagePlugin, Radio, Select, Tag } from "tdesign-react";
import { AddIcon, DeleteIcon } from "tdesign-icons-react";
import { saveCharacterStatWeightAction, type PropMapRow } from "./asset-actions";
import {
  isScoreDim,
  isTravelerAvatar,
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
 * 「推荐属性」——角色推荐词条（副词条 + 三主词条）。
 *
 * 2026-09-27 用户决定：**每个词条只有一个数字** ✓
 *   · 这个数字**同时是**"推荐优先级"与"圣遗物评分权重"（0~100，小助手口径 ✓）——
 *     不再有独立的评分权重块/第二张表 ✗（两处维护必然漂移）；
 *   · 代价：卡片着色与排序、AI 推荐文案都会跟着这个数字走 ✓（用户明确接受 ✓）；
 *   · 旅行者**按元素当不同角色算** ⇒ 顶部可切换元素形态，编辑的是该形态的覆盖值 ✓。
 *
 * ⚠️ 非评分维度（如白值攻击 `FIGHT_PROP_ATTACK`）也在这张列表里，但它们**不参与算分** ✓，
 * 界面上会标出来，数字仅为展示优先级。
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
  const [byElement, setByElement] = useState<Record<string, Record<string, number>>>(() => ({ ...(initial?.byElement ?? {}) }));
  const [tab, setTab] = useState<string>(""); // "" = 通用（其余元素为覆盖值）
  const [pendingElement, setPendingElement] = useState<string>("");

  const propOptions = useMemo(
    () => propMaps.map((p) => ({ label: `${p.name}（${p.propId}）`, value: p.propId })),
    [propMaps],
  );

  const elementKeys = useMemo(() => Object.keys(byElement), [byElement]);
  const addableElements = ELEMENT_OPTIONS.filter((o) => !elementKeys.includes(o.value));

  /** 某词条在当前形态下的生效权重：元素形态未覆盖时回落到通用值 ✓ */
  const weightOf = (row: { statKey: string; weight: number }) =>
    tab === "" ? row.weight : (byElement[tab]?.[row.statKey] ?? row.weight);

  const setWeightOf = (index: number, weight: number) => {
    if (tab === "") {
      setSubStats((rows) => rows.map((r, i) => (i === index ? { ...r, weight } : r)));
      return;
    }
    const statKey = subStats[index]?.statKey;
    if (!statKey) return;
    setByElement((m) => ({ ...m, [tab]: { ...(m[tab] ?? {}), [statKey]: weight } }));
  };

  const updateRow = (index: number, patch: Partial<{ statKey: string; tier: StatWeightTier | "" }>) => {
    setSubStats((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const addRow = () => setSubStats((rows) => [...rows, { statKey: "", weight: 0, tier: "" }]);
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
    const payload: StatWeightPayload = { subStats: cleaned, mainStats };
    if (elementKeys.length > 0) payload.byElement = byElement;
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
      width={820}
      onClose={() => onClose(false)}
      onConfirm={handleSave}
      confirmBtn={{ content: "保存", loading: saving }}
    >
      <div className="space-y-6 pt-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">副词条推荐</p>
            </div>
            <Button size="small" variant="outline" icon={<AddIcon />} onClick={addRow}>
              添加词条
            </Button>
          </div>

          {/* 元素形态只有旅行者需要 ✓（按元素当不同角色算）；其它角色不显示这个框 ✓ */}
          {isTravelerAvatar(characterId) ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
              <span className="text-xs text-slate-500">编辑形态：</span>
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
                      // 新形态默认继承通用值 ✓
                      const base: Record<string, number> = {};
                      for (const r of subStats) if (r.statKey) base[r.statKey] = r.weight;
                      setByElement((m) => ({ ...m, [pendingElement]: base }));
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
              <span className="text-xs text-slate-400">
                {tab === "" ? "（旅行者按元素当不同角色算，这里是不分元素时的兜底 ✓）" : `（${tab}主的覆盖值，未填的沿用通用 ✓）`}
              </span>
            </div>
          ) : null}

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
                    value={String(weightOf(row))}
                    onChange={(value) => {
                      const raw = String(value).replace(/\D/g, "");
                      setWeightOf(index, raw === "" ? 0 : Math.min(100, Number(raw)));
                    }}
                    placeholder="0~100"
                  />
                </div>
                <div className="w-36">
                  <Select
                    value={row.tier}
                    onChange={(value) => updateRow(index, { tier: String(value) as StatWeightTier | "" })}
                    options={TIER_OPTIONS}
                  />
                </div>
                <div className="w-24 shrink-0">
                  {row.statKey && !isScoreDim(row.statKey) ? (
                    <Tag theme="warning" variant="light" size="small">
                      非评分维度
                    </Tag>
                  ) : null}
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
      </div>
    </Dialog>
  );
}
