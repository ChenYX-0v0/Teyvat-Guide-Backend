import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

export type StatWeightTier = "primary" | "secondary";

/** 单条副词条推荐：statKey 为 FIGHT_PROP_* 枚举，tier 决定前端着色 */
export type StatWeightEntry = {
  statKey: string;
  weight: number;
  tier?: StatWeightTier;
};

/** 角色推荐属性 payload（与 teyvatGuide 的 JSON 结构保持一致） */
export type StatWeightPayload = {
  subStats: StatWeightEntry[];
  mainStats: {
    sand: string;
    goblet: string;
    circlet: string;
  };
};

/**
 * 影子实体：对应 teyvatGuide 库的 `character_stat_weights` 表（角色推荐词条）。
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
