"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/session";
import { listCharacterGuides, saveCharacterGuide, type GuideEditInput } from "@/lib/teyvat/guides";

/** 列表行（日期转成 ISO 字符串再交给客户端组件 ✓） */
export type GuideRow = {
  characterId: number;
  name: string;
  role: string;
  talents: string;
  weaponPick: string;
  relicPick: string;
  teamPick: string;
  teamFrom: string; // page | reverse | ""
  graduation: string;
  notes: string;
  sourceUrl: string;
  sourceRev: string;
  fetchedAt: string;
  updatedAt: string;
};

export type GuideActionResult = { success: boolean; message: string };

const toIso = (value: Date | null | undefined): string =>
  value instanceof Date ? value.toISOString() : "";

export async function loadGuidesAction(): Promise<GuideRow[]> {
  await requireAdmin();
  const rows = await listCharacterGuides();
  return rows.map((row) => ({
    // bigint 列在 TypeORM 下可能以字符串回传 ⇒ 统一转 number 再给前端 ✓
    characterId: Number(row.characterId),
    name: row.name,
    role: row.role ?? "",
    talents: row.talents ?? "",
    weaponPick: row.weaponPick ?? "",
    relicPick: row.relicPick ?? "",
    teamPick: row.teamPick ?? "",
    teamFrom: row.teamFrom ?? "",
    graduation: row.graduation ?? "",
    notes: row.notes ?? "",
    sourceUrl: row.sourceUrl ?? "",
    sourceRev: row.sourceRev ?? "",
    fetchedAt: toIso(row.fetchedAt),
    updatedAt: toIso(row.updatedAt),
  }));
}

export async function saveGuideAction(input: GuideEditInput): Promise<GuideActionResult> {
  await requireAdmin();
  try {
    await saveCharacterGuide(input);
    revalidatePath("/admin");
    return { success: true, message: `已保存「${input.characterId}」的攻略卡` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    console.error(`[teyvat-guides] 写入失败 | err=${message} | 时间=${new Date().toISOString()}`);
    return { success: false, message };
  }
}
