import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 影子实体：对应 teyvatGuide 库的 `missings` 表（翻译缺漏收集，补录依据）。
 * 该表归 teyvatGuide 的 GORM AutoMigrate 所有，本系统只读写、禁止改动结构。
 */
@Entity({ name: "missings" })
export class TeyvatMissing {
  @PrimaryColumn({ type: "varchar", length: 16, comment: "character | weapon | relic_set | text | prop" })
  kind!: string;

  @PrimaryColumn({ name: "asset_id", type: "varchar", length: 64 })
  assetId!: string;

  @Column({ name: "first_seen", type: "datetime", precision: 3 })
  firstSeen!: Date;

  @Column({ name: "hit_count", type: "bigint" })
  hitCount!: number;
}
