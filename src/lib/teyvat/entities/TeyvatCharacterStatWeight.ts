import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

export type StatWeightTier = "primary" | "secondary";

/** 单条副词条推荐：statKey 为 FIGHT_PROP_* 枚举，tier 决定前端着色 */
export type StatWeightEntry = {
  statKey: string;
  weight: number;
  tier?: StatWeightTier;
};

/**
 * 评分维度（小助手口径 7 维）—— `propId` 就是词条 key（`FIGHT_PROP_*`），
 * 与 `subStats[].statKey` 是**同一批 key**：用户要的"用 key 对齐"就靠这个 ✓，
 * 服务端 `mpWeightFromDims` 也是按这批 key 还原 7 维权重（口径见 `teyvat-docs/ai/08`）。
 */
export const RELIC_SCORE_DIMS = [
  { key: "hp", propId: "FIGHT_PROP_HP_PERCENT", label: "百分比生命值" },
  { key: "atk", propId: "FIGHT_PROP_ATTACK_PERCENT", label: "百分比攻击力" },
  { key: "def", propId: "FIGHT_PROP_DEFENSE_PERCENT", label: "百分比防御力" },
  { key: "cpct", propId: "FIGHT_PROP_CRITICAL", label: "暴击率" },
  { key: "cdmg", propId: "FIGHT_PROP_CRITICAL_HURT", label: "暴击伤害" },
  { key: "mastery", propId: "FIGHT_PROP_ELEMENT_MASTERY", label: "元素精通" },
  { key: "recharge", propId: "FIGHT_PROP_CHARGE_EFFICIENCY", label: "元素充能效率" },
] as const;

export type RelicScoreDimKey = (typeof RELIC_SCORE_DIMS)[number]["key"];

/**
 * 角色推荐属性 payload —— **每个词条只有一个数字** ✓
 *
 * 2026-09-27 用户决定：不再有独立的"评分权重"块 ✗ —— `subStats[].weight` 既是推荐优先级，
 * **也是圣遗物评分权重**（0~100，小助手口径 ✓）。代价是卡片着色/排序与 AI 文案跟着它走 ✓（已确认接受）。
 *
 * `byElement` 仅旅行者用（"不同元素当不同角色算" ✓）：元素 →（`FIGHT_PROP_*` → 权重覆盖）。
 */
export type StatWeightPayload = {
  subStats: StatWeightEntry[];
  mainStats: {
    sand: string;
    goblet: string;
    circlet: string;
  };
  byElement?: Record<string, Record<string, number>>;
};

/** 该 statKey 是否属于"评分维度"（7 维之一）—— 非评分维度（如白值攻击）不参与算分 ✓ */
export function isScoreDim(statKey: string): boolean {
  return RELIC_SCORE_DIMS.some((d) => d.propId === statKey);
}

/**
 * 旅行者系：空(10000005) / 荧(10000007) / 奇偶·男性(10000117) / 奇偶·女性(10000118)。
 *
 * ⚠️ 只有它们才有"元素形态"概念（`byElement`）⇒ 后台**只对它们**显示"编辑形态" ✓。
 * ⚠️ `10000006` **不是**旅行者，是**丽莎** ✗（与 server 端 `travelerAvatarIDs` 同一份事实 ✓）。
 */
export const TRAVELER_AVATAR_IDS = [10000005, 10000007, 10000117, 10000118];

/** 是否旅行者系（决定要不要显示"元素形态"编辑 ✓） */
export function isTravelerAvatar(characterId: number): boolean {
  return TRAVELER_AVATAR_IDS.includes(characterId);
}

/**
 * 影子实体：对应 teyvatGuide 库的 `character_stat_weights` 表（角色推荐词条 + 评分权重）。
 * 该表归 teyvatGuide 的 GORM AutoMigrate 所有，本系统只读写、禁止改动结构。
 */
@Entity({ name: "character_stat_weights" })
export class TeyvatCharacterStatWeight {
  @PrimaryColumn({ name: "character_id", type: "bigint", comment: "avatarId" })
  characterId!: number;

  @Column({ type: "json", nullable: true })
  payload!: StatWeightPayload | null;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;
}
