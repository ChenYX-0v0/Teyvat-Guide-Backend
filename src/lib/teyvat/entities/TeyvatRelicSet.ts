import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * 影子实体：对应 teyvatGuide 库的 `relic_sets` 表（圣遗物套装映射）。
 * 该表归 teyvatGuide 的 GORM AutoMigrate 所有，本系统只读写、禁止改动结构。
 */
@Entity({ name: "relic_sets" })
export class TeyvatRelicSet {
  @PrimaryColumn({ name: "set_id", type: "bigint", comment: "套装 ID" })
  setId!: number;

  @Column({ type: "varchar", length: 64 })
  name!: string;

  @Column({ type: "varchar", length: 128 })
  icon!: string;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;
}
