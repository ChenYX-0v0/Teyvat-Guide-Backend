import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * 影子实体：对应 teyvatGuide 库的 `weapons` 表（武器映射）。
 * 该表归 teyvatGuide 的 GORM AutoMigrate 所有，本系统只读写、禁止改动结构。
 */
@Entity({ name: "weapons" })
export class TeyvatWeapon {
  @PrimaryColumn({ type: "bigint", comment: "weaponId" })
  id!: number;

  @Column({ type: "varchar", length: 64 })
  name!: string;

  @Column({ name: "en_name", type: "varchar", length: 64 })
  enName!: string;

  @Column({ type: "bigint" })
  rarity!: number;

  @Column({ type: "varchar", length: 32, comment: "单手剑/弓/法器/长柄武器/双手剑" })
  type!: string;

  @Column({ type: "varchar", length: 128 })
  icon!: string;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;
}
