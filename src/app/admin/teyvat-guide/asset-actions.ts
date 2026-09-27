"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import {
  listCharacterStatWeights,
  listCharacters,
  listPropMaps,
  listRelicSetEffects,
  listRelicSets,
  listWeapons,
  removeCharacter,
  removeRelicSet,
  removeRelicSetEffects,
  removeWeapon,
  saveCharacter,
  saveCharacterStatWeight,
  saveRelicSet,
  saveRelicSetEffects,
  saveWeapon,
  syncAfterAssetChange,
  listRelicWeightRules,
  listRelicWeightsMP,
  type CharacterInput,
  type RelicSetInput,
  type SyncResult,
  type WeaponInput,
} from "@/lib/teyvat/assets";
import type { StatWeightPayload } from "@/lib/teyvat/entities";

export type CharacterRow = { id: number; name: string; enName: string; element: string; rarity: number; icon: string };
export type WeaponRow = { id: number; name: string; enName: string; rarity: number; type: string; icon: string };
export type RelicSetRow = { setId: number; name: string; icon: string };
export type PropMapRow = { propId: string; name: string; percent: number };
/** 套装效果（V2.2）：一行 = 一个套装的一个件数 */
export type RelicSetEffectRow = { setId: number; piece: number; effect: string; source: string };
/**
 * 评分权重行（小助手口径 7 维）——**主键是 (角色, 元素)**，旅行者有 7 个元素形态各一行，
 * 另有 `element = ''` 的通用行。口径真源 `teyvat-docs/ai/08`。
 */
export type RelicWeightMpRow = {
  characterId: number;
  element: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  cpct: number;
  cdmg: number;
  mastery: number;
  recharge: number;
};

/** 评分权重的条件覆盖规则行（`characterId = 0` = 通用级；**参与算分**） */
export type RelicWeightRuleRow = {
  id: number;
  characterId: number;
  characterName: string;
  condType: string;
  condOp: string;
  condValue: string;
  condNum: number;
  statKey: string;
  effect: string;
  priority: number;
  delta: number;
  value: number;
  valueMin: number;
  valueMax: number;
  dims: string;
  requireStat: string;
  requireMin: number;
};

export type AssetsData = {
  characters: CharacterRow[];
  weapons: WeaponRow[];
  relicSets: RelicSetRow[];
  relicSetEffects: RelicSetEffectRow[];
  propMaps: PropMapRow[];
  statWeights: Record<number, StatWeightPayload>;
  relicWeightsMp: RelicWeightMpRow[];
  relicWeightRules: RelicWeightRuleRow[];
};

export type ActionResult = { success: boolean; message: string; sync?: SyncResult };

function toCharacterRow(row: { id: number | string; name: string; enName: string; element: string; rarity: number | string; icon: string }): CharacterRow {
  return { id: Number(row.id), name: row.name, enName: row.enName, element: row.element, rarity: Number(row.rarity), icon: row.icon };
}

function toWeaponRow(row: { id: number | string; name: string; enName: string; rarity: number | string; type: string; icon: string }): WeaponRow {
  return { id: Number(row.id), name: row.name, enName: row.enName, rarity: Number(row.rarity), type: row.type, icon: row.icon };
}

function toRelicSetRow(row: { setId: number | string; name: string; icon: string }): RelicSetRow {
  return { setId: Number(row.setId), name: row.name, icon: row.icon };
}

// bigint 列（set_id / piece）在 TypeORM 下可能以字符串回传，统一转成 number 再给前端
function toRelicSetEffectRow(row: { setId: number | string; piece: number | string; effect: string; source: string }): RelicSetEffectRow {
  return { setId: Number(row.setId), piece: Number(row.piece), effect: row.effect, source: row.source };
}

/** 加载映射表、套装效果、推荐属性与**评分标准**（小助手口径 + 条件规则）数据 */
export async function loadAssetsAction(): Promise<AssetsData> {
  await requireAdmin();
  const [characters, weapons, relicSets, relicSetEffects, propMaps, statWeights, relicWeightsMp, relicWeightRules] = await Promise.all([
    listCharacters(),
    listWeapons(),
    listRelicSets(),
    listRelicSetEffects(),
    listPropMaps(),
    listCharacterStatWeights(),
    listRelicWeightsMP(),
    listRelicWeightRules(),
  ]);
  const statWeightMap: Record<number, StatWeightPayload> = {};
  for (const item of statWeights) {
    if (item.payload) statWeightMap[Number(item.characterId)] = item.payload;
  }
  return {
    characters: characters.map(toCharacterRow),
    weapons: weapons.map(toWeaponRow),
    relicSets: relicSets.map(toRelicSetRow),
    relicSetEffects: relicSetEffects.map(toRelicSetEffectRow),
    propMaps: propMaps.map((p) => ({ propId: p.propId, name: p.name, percent: Number(p.percent) })),
    statWeights: statWeightMap,
    // bigint / int 列在 TypeORM 下可能以字符串回传，统一转 number（与上面几个 to*Row 同套路）
    relicWeightsMp: relicWeightsMp.map((r) => ({
      characterId: Number(r.characterId),
      element: r.element ?? "",
      name: r.name ?? "",
      hp: Number(r.hp),
      atk: Number(r.atk),
      def: Number(r.def),
      cpct: Number(r.cpct),
      cdmg: Number(r.cdmg),
      mastery: Number(r.mastery),
      recharge: Number(r.recharge),
    })),
    relicWeightRules: relicWeightRules.map((r) => ({
      id: Number(r.id),
      characterId: Number(r.characterId),
      characterName: r.characterName ?? "",
      condType: r.condType,
      condOp: r.condOp,
      condValue: r.condValue,
      condNum: Number(r.condNum),
      statKey: r.statKey,
      effect: r.effect,
      priority: Number(r.priority),
      delta: Number(r.delta),
      value: Number(r.value),
      valueMin: Number(r.valueMin),
      valueMax: Number(r.valueMax),
      dims: r.dims ?? "",
      requireStat: r.requireStat ?? "",
      requireMin: Number(r.requireMin),
    })),
  };
}

async function runWrite(write: () => Promise<void>): Promise<ActionResult> {
  await requireAdmin();
  try {
    await write();
    const sync = await syncAfterAssetChange();
    revalidatePath("/admin");
    return { success: true, message: sync.message, sync };
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失败";
    console.error(`[teyvat-assets] 写入失败 | err=${message} | 时间=${new Date().toISOString()}`);
    return { success: false, message };
  }
}

export async function saveCharacterAction(input: CharacterInput): Promise<ActionResult> {
  return runWrite(() => saveCharacter(input));
}

export async function removeCharacterAction(id: number): Promise<ActionResult> {
  return runWrite(() => removeCharacter(id));
}

export async function saveWeaponAction(input: WeaponInput): Promise<ActionResult> {
  return runWrite(() => saveWeapon(input));
}

export async function removeWeaponAction(id: number): Promise<ActionResult> {
  return runWrite(() => removeWeapon(id));
}

export async function saveRelicSetAction(input: RelicSetInput): Promise<ActionResult> {
  return runWrite(() => saveRelicSet(input));
}

export async function removeRelicSetAction(setId: number): Promise<ActionResult> {
  return runWrite(() => removeRelicSet(setId));
}

export async function saveCharacterStatWeightAction(characterId: number, payload: StatWeightPayload): Promise<ActionResult> {
  return runWrite(() => saveCharacterStatWeight(characterId, payload));
}

// ---------- 套装效果（V2.2） ----------

/**
 * 保存某套装的 2 / 4 件文本（留空 = 删掉该件数那条）。
 * 一次写入两条再统一 reload：避免连点两次触发两遍内存刷新。
 */
export async function saveRelicSetEffectsAction(
  setId: number,
  texts: { piece2: string; piece4: string },
  source: string,
): Promise<ActionResult> {
  return runWrite(() => saveRelicSetEffects(setId, texts, source));
}

/** 删除某套装的全部效果（2 与 4 一起） */
export async function removeRelicSetEffectsAction(setId: number): Promise<ActionResult> {
  return runWrite(() => removeRelicSetEffects(setId));
}
