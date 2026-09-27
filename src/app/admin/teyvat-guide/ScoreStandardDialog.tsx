"use client";

import { useMemo, useState } from "react";
import { Button, Dialog, Radio, Table, Tag } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { RELIC_COND_LABELS, RELIC_EFFECT_LABELS, RELIC_SCORE_DIMS } from "@/lib/teyvat/entities";
import type { RelicWeightMpRow, RelicWeightRuleRow } from "./asset-actions";

/**
 * 「评分标准」——只读展示某个角色的圣遗物评分口径。
 *
 * 为什么要它：评分权重（`character_relic_weights_mp` + `character_relic_weight_rules`）
 * 之前只存在于数据库与 `teyvat-docs/ai/08`，后台看不到（用户反馈 ✗）。
 *
 * 三条口径（2026-09-27 用户决定）：
 *   ① 只以「小助手（小程序）」口径为准（miao 那套不混进来）；
 *   ② 旅行者按元素当不同角色算 ⇒ 主键是 (角色, 元素)，这里用元素切换查看；
 *   ③ 条件规则先只读展示 —— 它们确实参与算分（西风 / 绝缘4 / 命座 / 专武 都会改分）。
 */
export function ScoreStandardDialog({
  characterId,
  characterName,
  rows,
  rules,
  onClose,
}: {
  characterId: number;
  characterName: string;
  rows: RelicWeightMpRow[];
  rules: RelicWeightRuleRow[];
  onClose: () => void;
}) {
  // 该角色在 mp 表里的行（'' = 通用行；旅行者另有 风/岩/雷/草/水/火/冰）
  const ownRows = useMemo(() => rows.filter((r) => r.characterId === characterId), [rows, characterId]);
  const elements = useMemo(() => ownRows.map((r) => r.element).filter((e) => e !== ""), [ownRows]);

  const [element, setElement] = useState<string>(() => (elements.length === 1 ? elements[0] : ""));
  const current = ownRows.find((r) => r.element === element);

  // 生效规则：通用级（characterId=0）恒生效；角色级只列本角色的
  const effectiveRules = useMemo(
    () => rules.filter((r) => r.characterId === 0 || r.characterId === characterId),
    [rules, characterId],
  );
  const globalRules = effectiveRules.filter((r) => r.characterId === 0);
  const ownRules = effectiveRules.filter((r) => r.characterId !== 0);

  const dimRows = RELIC_SCORE_DIMS.map((d) => ({
    propId: d.propId,
    label: d.label,
    weight: current ? Number(current[d.key]) : null,
  }));

  const dimColumns: PrimaryTableCol<(typeof dimRows)[number]>[] = [
    { colKey: "label", title: "词条", width: 150 },
    { colKey: "propId", title: "词条 key（与推荐词条对齐）", ellipsis: true },
    {
      colKey: "weight",
      title: "评分权重",
      width: 130,
      cell: ({ row }) =>
        row.weight === null ? (
          <span className="text-slate-400">无数据</span>
        ) : row.weight === 0 ? (
          <span className="text-slate-400">0（不吃这一维）</span>
        ) : (
          <span className="font-medium text-slate-800">{row.weight}</span>
        ),
    },
  ];

  const ruleText = (r: RelicWeightRuleRow) => {
    const cond = `${RELIC_COND_LABELS[r.condType] ?? r.condType}：${r.condOp} ${r.condValue}${
      r.condNum ? `（含数值 ≥ ${r.condNum}）` : ""
    }`;
    let act = `${RELIC_EFFECT_LABELS[r.effect] ?? r.effect} → ${r.statKey}`;
    if (r.delta) act += ` ${r.delta > 0 ? "+" : ""}${r.delta}`;
    if (r.value) act += ` 抬到 ${r.value}`;
    if (r.valueMin || r.valueMax) act += ` R1~R5 增量 ${r.valueMin}~${r.valueMax}`;
    if (r.dims) act += `（参照：${r.dims}）`;
    if (r.requireStat) act += ` ⚠️ 仅当 ${r.requireStat} ≥ ${r.requireMin} 时生效`;
    return { cond, act };
  };

  return (
    <Dialog
      visible
      header={
        <span>
          评分标准 · {characterName}
          <span className="ml-2 text-xs font-normal text-slate-400">（小助手口径，只读）</span>
        </span>
      }
      width={860}
      footer={
        <Button theme="default" variant="outline" onClick={onClose}>
          关闭
        </Button>
      }
      onClose={onClose}
    >
      <div className="space-y-5 pt-2">
        {ownRows.length === 0 ? (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            该角色在评分权重表里没有任何行（含通用行）⇒ 运行时退回「包内嵌种子」兜底 —— 页面看不到 ≠ 算不出分 ✓
          </div>
        ) : null}

        {elements.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">元素形态</p>
            <p className="mb-2 text-xs text-slate-400">
              旅行者的不同元素当作不同角色分开算 ⇒ 每种形态一行权重，另有「通用」行兜底。
            </p>
            <Radio.Group value={element} onChange={(v) => setElement(String(v))} variant="default-filled">
              <Radio.Button value="">通用</Radio.Button>
              {elements.map((e) => (
                <Radio.Button key={e} value={e}>
                  {e}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">收益权重（7 维，0~100；0 = 该角色不吃这一维）</p>
          <Table rowKey="propId" size="small" data={dimRows} columns={dimColumns} pagination={undefined} bordered />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">生效的条件规则（会影响算分 ✗ 不是注释）</p>
          {ownRules.length === 0 && globalRules.length === 0 ? (
            <p className="text-sm text-slate-400">该角色没有任何生效规则</p>
          ) : (
            <div className="space-y-2">
              {[...ownRules, ...globalRules].map((r) => {
                const { cond, act } = ruleText(r);
                return (
                  <div key={r.id} className="rounded border border-slate-200 p-2.5 text-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <Tag theme={r.characterId === 0 ? "default" : "primary"} variant="light">
                        {r.characterId === 0 ? "通用级" : `角色级 · ${r.characterName || r.characterId}`}
                      </Tag>
                      <span className="text-xs text-slate-400">优先级 {r.priority}（越小越先算）</span>
                    </div>
                    <div className="text-slate-700">
                      <span className="text-slate-400">如果 </span>
                      {cond}
                    </div>
                    <div className="text-slate-700">
                      <span className="text-slate-400">则 </span>
                      {act}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
          <p>· 口径与公式见 teyvat-docs/ai/08-圣遗物评分设计与落地.md；评分只在服务端计算 ✓</p>
          <p>· 档位阈值沿用既有那套（ACE ≥ 40、MAX ≥ 45）；主词条不计分 ✓</p>
          <p>· 求值顺序：先加减（优先级 10/20）→ 后抬升（30/40）—— 顺序会改变结果 ✗ 不是装饰</p>
          <p>· 本页只读：权重来自 miao-plugin / 小助手导入件，改动仍走「生成脚本 → 种子 → 导入」链 ✓</p>
        </div>
      </div>
    </Dialog>
  );
}
