import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 影子实体：对应 teyvatGuide 库的 `prop_maps` 表（属性 ID → 词条名）。
 * 该表归 teyvatGuide 的 GORM AutoMigrate 所有，本系统只读写、禁止改动结构。
 */
@Entity({ name: "prop_maps" })
export class TeyvatPropMap {
  @PrimaryColumn({ name: "prop_id", type: "varchar", length: 32, comment: "FIGHT_PROP_HP / FIGHT_PROP_CRITICAL..." })
  propId!: string;

  @Column({ type: "varchar", length: 32, comment: "生命值 / 暴击率" })
  name!: string;

  @Column({ type: "tinyint", comment: "1=百分比词条" })
  percent!: number;
}
