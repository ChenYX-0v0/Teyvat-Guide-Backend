import "server-only";

import { getTeyvatDataSource } from "./db";
import { CharacterGuide } from "./entities";

/** 按角色 id 升序列出全部攻略卡（表不大，一次全取 ✓） */
export async function listCharacterGuides() {
  const ds = await getTeyvatDataSource();
  return ds.getRepository(CharacterGuide).find({ order: { characterId: "ASC" } });
}

/** 后台允许人工订正的 7 个文本槽（其余字段只读 ✓） */
export type GuideEditInput = {
  characterId: number;
  role: string;
  talents: string;
  weaponPick: string;
  relicPick: string;
  teamPick: string;
  graduation: string;
  notes: string;
};

/**
 * 保存人工订正。
 *
 * ⚠️ 刻意**不动 `content_hash` 与来源字段** ✓：
 *   `guideimport` 的幂等判断是「按攻略页内容算出的 hash 与库里存的 hash 比」——
 *   人工改完文本但 hash 不变 ⇒ 攻略页没更新时重跑导入会**跳过这一行** ✓，
 *   订正不会被悄悄覆盖（只有攻略页真的更新了、hash 变了，才会整行重写 ✓）。
 */
export async function saveCharacterGuide(input: GuideEditInput) {
  const ds = await getTeyvatDataSource();
  const repo = ds.getRepository(CharacterGuide);
  const existing = await repo.findOne({ where: { characterId: input.characterId } });
  if (!existing) {
    throw new Error(`没有找到角色 ${input.characterId} 的攻略卡（先在服务端跑 cmd/guideimport）`);
  }
  Object.assign(existing, {
    role: input.role,
    talents: input.talents,
    weaponPick: input.weaponPick,
    relicPick: input.relicPick,
    teamPick: input.teamPick,
    graduation: input.graduation,
    notes: input.notes,
  });
  await repo.save(existing);
}
