import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * 影子实体：对应 teyvatGuide 库的 `relic_set_effects` 表（圣遗物套装 2/4 件效果，V2.2）。
 * 该表归 teyvatGuide 的 GORM AutoMigrate 所有，本系统只读写、禁止改动结构。
 *
 * 主键 (set_id, piece)：一个套装每个件数只有一条，改文案 = 覆盖这一条（不做版本管理）。
 * `source` 记录来源与核对状态（如「官方资料整理·待核对」），用于区分草稿与已核对数据。
 */
@Entity({ name: "relic_set_effects" })
export class TeyvatRelicSetEffect {
  @PrimaryColumn({ name: "set_id", type: "bigint", comment: "套装 ID" })
  setId!: number;

  @PrimaryColumn({ type: "bigint", comment: "件数：2 或 4" })
  piece!: number;

  @Column({ type: "text", comment: "该件数的效果文本" })
  effect!: string;

  @Column({ type: "varchar", length: 64, comment: "来源与核对状态" })
  source!: string;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;
}
