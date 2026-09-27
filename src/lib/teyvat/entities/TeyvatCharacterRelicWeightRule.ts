import { Column, Entity, PrimaryColumn } from "typeorm";

/** 规则效果类型（与 teyvatGuide `model.go` 的常量一致） */
export const RELIC_EFFECT_LABELS: Record<string, string> = {
  delta: "加减（命中即 ±Delta）",
  delta_refine: "按武器精炼线性增量（R1~R5）",
  raise_to: "只升不降地抬到 Value",
  raise_to_max_of: "抬到参照维度里的最高者",
};

/** 条件类型 */
export const RELIC_COND_LABELS: Record<string, string> = {
  weapon: "武器名精确匹配",
  weapon_regex: "武器名正则",
  cons: "命座数",
  set: "套装名 + 件数",
};

/**
 * 影子实体：对应 teyvatGuide 库的 `character_relic_weight_rules` 表（评分权重的条件覆盖规则）。
 *
 * 一行 = 一条"**如果…则…**"：
 *   - `characterId = 0` 表示**通用级**（对所有角色生效，例如 西风系列 → 暴击率抬到 100）；
 *   - 否则是**角色级**（例如 菲林斯 + 武器「血染荒城」→ 充能 −5）。
 * `priority` 决定求值顺序（10/20 加减 → 30/40 抬升），**顺序会改变结果**，不是装饰。
 *
 * ⚠️ 这些规则**确实参与算分**，所以即使后台先只读，也必须能看到它们。
 * 该表归 teyvatGuide 的 GORM AutoMigrate 所有，本系统只读、禁止改动结构。
 */
@Entity({ name: "character_relic_weight_rules" })
export class TeyvatCharacterRelicWeightRule {
  @PrimaryColumn({ type: "bigint" })
  id!: number;

  /** 0 = 通用于所有角色 */
  @Column({ name: "character_id", type: "bigint", default: 0 })
  characterId!: number;

  @Column({ name: "character_name", type: "varchar", length: 32, nullable: true })
  characterName!: string | null;

  @Column({ name: "cond_type", type: "varchar", length: 16 })
  condType!: string;

  @Column({ name: "cond_op", type: "varchar", length: 8 })
  condOp!: string;

  @Column({ name: "cond_value", type: "varchar", length: 32 })
  condValue!: string;

  @Column({ name: "cond_num", type: "int", default: 0 })
  condNum!: number;

  @Column({ name: "stat_key", type: "varchar", length: 16 })
  statKey!: string;

  @Column({ type: "varchar", length: 16, default: "delta" })
  effect!: string;

  @Column({ type: "int", default: 0 })
  priority!: number;

  @Column({ type: "int", default: 0 })
  delta!: number;

  @Column({ type: "int", default: 0 })
  value!: number;

  @Column({ name: "value_min", type: "int", default: 0 })
  valueMin!: number;

  @Column({ name: "value_max", type: "int", default: 0 })
  valueMax!: number;

  @Column({ type: "varchar", length: 64, nullable: true })
  dims!: string | null;

  @Column({ name: "require_stat", type: "varchar", length: 16, nullable: true })
  requireStat!: string | null;

  @Column({ name: "require_min", type: "int", default: 0 })
  requireMin!: number;
}
