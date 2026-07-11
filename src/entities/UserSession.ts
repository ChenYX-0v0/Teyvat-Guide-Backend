import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "user_sessions" })
@Index("idx_user_sessions_user", ["userId", "expiresAt"])
@Index("idx_user_sessions_expiry", ["expiresAt"])
export class UserSession {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ name: "token_hash", type: "char", length: 64, unique: true })
  tokenHash!: string;

  @Column({ name: "user_id", type: "bigint", unsigned: true })
  userId!: number;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt!: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;
}
