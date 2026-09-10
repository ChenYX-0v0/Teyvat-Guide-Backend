"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import {
  listCharacterStatWeights,
  listCharacters,
  listPropMaps,
  listRelicSets,
  listWeapons,
  removeCharacter,
  removeRelicSet,
  removeWeapon,
  saveCharacter,
  saveCharacterStatWeight,
  saveRelicSet,
  saveWeapon,
  syncAfterAssetChange,
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
export type AssetsData = {
  characters: CharacterRow[];
  weapons: WeaponRow[];
  relicSets: RelicSetRow[];
  propMaps: PropMapRow[];
  statWeights: Record<number, StatWeightPayload>;
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

/** 加载映射表与推荐属性数据 */
export async function loadAssetsAction(): Promise<AssetsData> {
  await requireAdmin();
  const [characters, weapons, relicSets, propMaps, statWeights] = await Promise.all([
    listCharacters(),
    listWeapons(),
    listRelicSets(),
    listPropMaps(),
    listCharacterStatWeights(),
  ]);
  const statWeightMap: Record<number, StatWeightPayload> = {};
  for (const item of statWeights) {
    if (item.payload) statWeightMap[Number(item.characterId)] = item.payload;
  }
  return {
    characters: characters.map(toCharacterRow),
    weapons: weapons.map(toWeaponRow),
    relicSets: relicSets.map(toRelicSetRow),
    propMaps: propMaps.map((p) => ({ propId: p.propId, name: p.name, percent: Number(p.percent) })),
    statWeights: statWeightMap,
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
