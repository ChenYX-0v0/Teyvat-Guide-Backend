import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * 影子实体：对应 teyvatGuide 库的 `character_guides` 表（角色攻略卡，阶段②，见 teyvat-docs/ai/07 TODO-18）。
 *
 * 与其它影子实体同一约定：该表归 teyvatGuide 的 **GORM AutoMigrate** 所有，
 * 本系统只读写数据、**禁止改动结构**（两个 DataSource 都保持 `synchronize: false` ✓）。
 *
 * ⚠️ `character_id` 在库里是**唯一索引**（真正的 PK 是自增 `id`）——
 * 这里把它当主键用，因为后台是"按哪个角色的卡"来定位并编辑的 ✓
 * （TypeORM 只需要一个唯一列来生成 WHERE ✓）。读出来是 bigint ⇒ 交给前端前要 `Number()` ✓
 */
@Entity({ name: "character_guides" })
export class CharacterGuide {
  @PrimaryColumn({ name: "character_id", type: "bigint", comment: "characters.id（avatarId）" })
  characterId!: number;

  @Column({ type: "varchar", length: 64, comment: "冗余角色名，后台列表直接显示" })
  name!: string;

  @Column({ type: "text", nullable: true, comment: "定位 + 体系" })
  role!: string | null;

  @Column({ type: "text", nullable: true, comment: "天赋加点顺序" })
  talents!: string | null;

  @Column({ name: "weapon_pick", type: "text", nullable: true, comment: "武器（毕业 + 可选）" })
  weaponPick!: string | null;

  @Column({ name: "relic_pick", type: "text", nullable: true, comment: "圣遗物套装 + 理由（不含主/副词条）" })
  relicPick!: string | null;

  @Column({ name: "team_pick", type: "text", nullable: true, comment: "配队思路" })
  teamPick!: string | null;

  @Column({ name: "team_from", type: "varchar", length: 16, nullable: true, comment: "page | reverse" })
  teamFrom!: string | null;

  @Column({ type: "text", nullable: true, comment: "毕业线（数值=社区口径）" })
  graduation!: string | null;

  @Column({ type: "text", nullable: true, comment: "注意事项（命座/手法/误区）" })
  notes!: string | null;

  // ---- 来源三件套：只读展示，人工订正时**不动它们** ✓（见 lib/teyvat/guides.ts 的注释）----
  @Column({ name: "source_url", type: "varchar", length: 512, nullable: true })
  sourceUrl!: string | null;

  @Column({ name: "source_rev", type: "varchar", length: 32, nullable: true })
  sourceRev!: string | null;

  @Column({ name: "fetched_at", type: "datetime", precision: 3, nullable: true })
  fetchedAt!: Date | null;

  @Column({ name: "content_hash", type: "varchar", length: 64, nullable: true })
  contentHash!: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime", precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 3 })
  updatedAt!: Date;
}
