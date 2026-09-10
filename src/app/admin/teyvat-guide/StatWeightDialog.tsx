"use client";

import { useMemo, useState } from "react";
import { Button, Dialog, Input, MessagePlugin, Select } from "tdesign-react";
import { AddIcon, DeleteIcon } from "tdesign-icons-react";
import { saveCharacterStatWeightAction, type PropMapRow } from "./asset-actions";
import type { StatWeightEntry, StatWeightPayload, StatWeightTier } from "@/lib/teyvat/entities";

const TIER_OPTIONS = [
  { label: "主要（金色）", value: "primary" },
  { label: "次要（白色）", value: "secondary" },
  { label: "未分级", value: "" },
];

const EMPTY_MAIN_STATS = { sand: "", goblet: "", circlet: "" };

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
  const [subStats, setSubStats] = useState<Array<{ statKey: string; weight: number; tier: StatWeightTier | "" }>>(
    () => (initial?.subStats ?? []).map((s) => ({ statKey: s.statKey, weight: s.weight, tier: s.tier ?? "" })),
  );
  const [mainStats, setMainStats] = useState(() => ({
    sand: initial?.mainStats?.sand ?? EMPTY_MAIN_STATS.sand,
    goblet: initial?.mainStats?.goblet ?? EMPTY_MAIN_STATS.goblet,
    circlet: initial?.mainStats?.circlet ?? EMPTY_MAIN_STATS.circlet,
  }));
  const [saving, setSaving] = useState(false);

  const propOptions = useMemo(
    () => propMaps.map((p) => ({ label: `${p.name}（${p.propId}）`, value: p.propId })),
    [propMaps],
  );

  const updateRow = (index: number, patch: Partial<{ statKey: string; weight: number; tier: StatWeightTier | "" }>) => {
    setSubStats((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => setSubStats((rows) => [...rows, { statKey: "", weight: 1, tier: "" }]);
  const removeRow = (index: number) => setSubStats((rows) => rows.filter((_, i) => i !== index));

  const handleSave = async () => {
    const cleaned: StatWeightEntry[] = subStats
      .filter((row) => row.statKey)
      .map((row) => (row.tier ? { statKey: row.statKey, weight: Number(row.weight) || 0, tier: row.tier } : { statKey: row.statKey, weight: Number(row.weight) || 0 }));
    if (cleaned.length === 0 && !mainStats.sand && !mainStats.goblet && !mainStats.circlet) {
      MessagePlugin.warning("请至少配置一条副词条或一项主词条");
      return;
    }
    setSaving(true);
    try {
      const result = await saveCharacterStatWeightAction(characterId, { subStats: cleaned, mainStats });
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
      width={720}
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
                    value={row.statKey || undefined}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">时之沙</label>
              <Input value={mainStats.sand} onChange={(value) => setMainStats((s) => ({ ...s, sand: String(value) }))} placeholder="如 攻击力" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">空之杯</label>
              <Input value={mainStats.goblet} onChange={(value) => setMainStats((s) => ({ ...s, goblet: String(value) }))} placeholder="如 冰元素伤害加成" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">理之冠</label>
              <Input value={mainStats.circlet} onChange={(value) => setMainStats((s) => ({ ...s, circlet: String(value) }))} placeholder="如 暴击率" />
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
