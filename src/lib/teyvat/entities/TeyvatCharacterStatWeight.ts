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
 * 评分权重块（**写在推荐属性 payload 里** —— 2026-09-27 用户决定：一份数据一个地方 ✓）。
 *
 *   dims      通用权重：`FIGHT_PROP_*` → 0~100（0 = 该角色不吃这一维）
 *   byElement 仅旅行者：元素 → 权重（覆盖 dims）—— 对应"旅行者按元素当不同角色算" ✓
 *
 * 服务端优先读它；`character_relic_weights_mp` 表已降级为过渡兜底（不删 ✓）。
 */
export type RelicScorePayload = {
  dims?: Record<string, number>;
  byElement?: Record<string, Record<string, number>>;
};

/** 角色推荐属性 payload（与 teyvatGuide 的 JSON 结构保持一致） */
export type StatWeightPayload = {
  subStats: StatWeightEntry[];
  mainStats: {
    sand: string;
    goblet: string;
    circlet: string;
  };
  /** 评分权重（可选：老数据没有；服务端缺省时退回 mp 表/包内嵌种子 ✓） */
  score?: RelicScorePayload;
};

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
