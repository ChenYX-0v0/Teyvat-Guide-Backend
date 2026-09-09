import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "managed_projects" })
export class ManagedProject {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "varchar", length: 64, unique: true, comment: "项目唯一标识，如 teyvat-guide" })
  code!: string;

  @Column({ type: "varchar", length: 100, comment: "项目显示名" })
  name!: string;

  @Column({ name: "base_url", type: "varchar", length: 255, comment: "业务项目服务地址" })
  baseUrl!: string;

  @Column({ name: "auth_type", type: "varchar", length: 32, default: "none", comment: "鉴权方式：header-key / bearer / none" })
  authType!: string;

  @Column({ name: "auth_config", type: "varchar", length: 255, nullable: true, comment: "凭证（优先使用环境变量覆盖）" })
  authConfig!: string | null;

  @Column({ name: "health_path", type: "varchar", length: 255, default: "/api/health", comment: "健康检查路径" })
  healthPath!: string;

  @Column({ type: "varchar", length: 16, default: "enabled", comment: "enabled / disabled" })
  status!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updatedAt!: Date;
}
