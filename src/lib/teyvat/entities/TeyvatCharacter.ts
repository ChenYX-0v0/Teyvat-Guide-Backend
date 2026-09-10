import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * 影子实体：对应 teyvatGuide 库的 `characters` 表（角色映射）。
 * 该表归 teyvatGuide 的 GORM AutoMigrate 所有，本系统只读写、禁止改动结构。
 */
@Entity({ name: "characters" })
export class TeyvatCharacter {
  @PrimaryColumn({ type: "bigint", comment: "avatarId" })
  id!: number;

  @Column({ type: "varchar", length: 64 })
  name!: string;

  @Column({ name: "en_name", type: "varchar", length: 64 })
  enName!: string;

  @Column({ type: "varchar", length: 16, comment: "冰/水/火/雷/风/岩/草" })
  element!: string;

  @Column({ type: "bigint", comment: "4 / 5" })
  rarity!: number;

  @Column({ type: "varchar", length: 128, comment: "UI_AvatarIcon_XXX" })
  icon!: string;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;
}
