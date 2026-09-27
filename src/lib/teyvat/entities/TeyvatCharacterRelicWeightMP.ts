import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 评分维度（小助手口径 7 维）——与 teyvatGuide 的 `relic_score_mp.go` 一一对应。
 *
 * 口径真源：`teyvat-docs/ai/08-圣遗物评分设计与落地.md`。
 * `propId` 是词条 key（`FIGHT_PROP_*`），用于与「推荐词条」里的 statKey 对齐展示；
 * 权重 0 = 该角色不吃这一维（不是"未配置"）。
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
 * 影子实体：对应 teyvatGuide 库的 `character_relic_weights_mp` 表（圣遗物评分权重·小助手口径）。
 *
 * ⚠️ 主键是 **(角色, 元素)** —— 与「推荐词条」表（一个角色一行）**不同**：
 * 旅行者有 7 个元素形态，每种形态一行，另有 `element = ''` 的通用行兜底。
 * 口径要求"旅行者按元素当不同角色算"，就是靠这个主键表达的。
 *
 * 该表归 teyvatGuide 的 GORM AutoMigrate 所有，本系统只读、禁止改动结构。
 */
@Entity({ name: "character_relic_weights_mp" })
export class TeyvatCharacterRelicWeightMP {
  @PrimaryColumn({ name: "character_id", type: "bigint", comment: "avatarId" })
  characterId!: number;

  /** 元素（'' = 通用行；仅旅行者有 风/岩/雷/草/水/火/冰 的多行） */
  @PrimaryColumn({ type: "varchar", length: 8, default: "" })
  element!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  name!: string | null;

  @Column({ type: "int", default: 0 })
  hp!: number;

  @Column({ type: "int", default: 0 })
  atk!: number;

  @Column({ type: "int", default: 0 })
  def!: number;

  @Column({ type: "int", default: 0 })
  cpct!: number;

  @Column({ type: "int", default: 0 })
  cdmg!: number;

  @Column({ type: "int", default: 0 })
  mastery!: number;

  @Column({ type: "int", default: 0 })
  recharge!: number;

  // 刻意不声明 updated_at：该列是否存在于 GORM 侧不确定 ✗，声明了就会「Unknown column」✗；
  // 这里只读展示，用不到它（要加先确认表结构 ✓）。
}
