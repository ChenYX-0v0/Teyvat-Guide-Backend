import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type PhoneVerificationPurpose =
  | "login"
  | "bind_phone"
  | "change_phone"
  | "recover_account";

@Entity({ name: "phone_verification_codes" })
@Index("idx_phone_codes_verify", ["phone", "purpose", "consumedAt", "expiresAt"])
@Index("idx_phone_codes_send_limit", ["phone", "purpose", "createdAt"])
@Index("idx_phone_codes_expiry", ["expiresAt"])
export class PhoneVerificationCode {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ name: "request_id", type: "char", length: 36, unique: true })
  requestId!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({
    type: "enum",
    enum: ["login", "bind_phone", "change_phone", "recover_account"],
    default: "login",
  })
  purpose!: PhoneVerificationPurpose;

  @Column({ name: "code_hash", type: "char", length: 64, select: false })
  codeHash!: string;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt!: Date;

  @Column({ name: "consumed_at", type: "timestamp", nullable: true })
  consumedAt!: Date | null;

  @Column({ name: "attempt_count", type: "tinyint", unsigned: true, default: 0 })
  attemptCount!: number;

  @Column({ name: "max_attempts", type: "tinyint", unsigned: true, default: 5 })
  maxAttempts!: number;

  @Column({ name: "sent_ip_hash", type: "char", length: 64, nullable: true })
  sentIpHash!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;
}
