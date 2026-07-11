import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "varchar", length: 100, unique: true })
  username!: string;

  @Column({ type: "varchar", length: 255, select: false })
  password!: string;

  @Column({ type: "varchar", length: 20, nullable: true, unique: true })
  phone!: string | null;

  @Column({ name: "phone_verified_at", type: "timestamp", nullable: true })
  phoneVerifiedAt!: Date | null;

  @Column({ name: "permission_level", type: "int", default: 1 })
  permissionLevel!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;
}
