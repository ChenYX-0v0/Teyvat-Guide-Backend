"use client";

import { useMemo, useState } from "react";
import { Button, Dialog, Radio, Table } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { RELIC_SCORE_DIMS } from "@/lib/teyvat/entities";
import type { RelicWeightMpRow } from "./asset-actions";

/**
 * 「评分标准」——展示某个角色的圣遗物评分口径（7 维收益权重）。
 *
 * 口径决定（2026-09-27）：
 *   ① 只以「小助手（小程序）」口径为准（miao 那套不混进来）；
 *   ② 旅行者按元素当不同角色算 ⇒ 主键是 (角色, 元素)，这里用元素切换查看；
 *   ③ **条件规则一律丢掉、不参与算分** ✗ —— 西风 / 绝缘4 / 武器适配 / 专精武 都不再改权重，
 *      所以本页只展示权重本身（原先那个「生效的条件规则」区块已按用户要求删除 ✓）。
 */
export function ScoreStandardDialog({
  characterId,
  characterName,
  rows,
  onClose,
}: {
  characterId: number;
  characterName: string;
  rows: RelicWeightMpRow[];
  onClose: () => void;
}) {
  // 该角色在 mp 表里的行（'' = 通用行；旅行者另有 风/岩/雷/草/水/火/冰）
  const ownRows = useMemo(() => rows.filter((r) => r.characterId === characterId), [rows, characterId]);
  const elements = useMemo(() => ownRows.map((r) => r.element).filter((e) => e !== ""), [ownRows]);

  const [element, setElement] = useState<string>(() => (elements.length === 1 ? elements[0] : ""));
  const current = ownRows.find((r) => r.element === element);

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

  return (
    <Dialog
      visible
      header={
        <span>
          评分标准 · {characterName}
          <span className="ml-2 text-xs font-normal text-slate-400">（小助手口径）</span>
        </span>
      }
      width={760}
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

        <div className="rounded bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
          <p>· 口径与公式见 teyvat-docs/ai/08-圣遗物评分设计与落地.md；评分只在服务端计算 ✓</p>
          <p>· 档位阈值沿用既有那套（ACE ≥ 40、MAX ≥ 45）；主词条不计分 ✓</p>
          <p>· 条件规则不参与算分（2026-09-27 决定）：西风 / 绝缘4 / 武器适配 / 专精武 都不再改权重 ✗</p>
        </div>
      </div>
    </Dialog>
  );
}
