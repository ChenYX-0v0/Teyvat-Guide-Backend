import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type PostStatus = "draft" | "published";

@Entity({ name: "posts" })
export class Post {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 220, unique: true })
  slug!: string;

  @Column({ type: "varchar", length: 500, default: "" })
  summary!: string;

  @Column({ type: "longtext" })
  content!: string;

  @Column({ type: "varchar", length: 100, default: "技术随笔" })
  category!: string;

  @Column({ type: "varchar", length: 500, default: "" })
  tags!: string;

  @Column({ type: "enum", enum: ["draft", "published"], default: "draft" })
  status!: PostStatus;

  @Column({ name: "published_at", type: "timestamp", nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updatedAt!: Date;
}
