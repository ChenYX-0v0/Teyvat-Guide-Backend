import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * 项目通知记录：向业务项目（如 teyvatGuide）发送通知（如刷新内存）的投递记录。
 * 失败记录保留在库中，可在「服务状态」页查看并重试。
 */
@Entity({ name: "project_notifications" })
export class ProjectNotification {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ name: "project_code", type: "varchar", length: 64, comment: "业务项目 code" })
  projectCode!: string;

  @Column({ type: "varchar", length: 64, comment: "动作，如 assets.reload" })
  action!: string;

  @Column({ type: "varchar", length: 16, default: "failed", comment: "failed / sent" })
  status!: string;

  @Column({ name: "http_status", type: "int", nullable: true, comment: "上游 HTTP 状态码" })
  httpStatus!: number | null;

  @Column({ type: "varchar", length: 500, comment: "结果说明" })
  message!: string;

  @Column({ type: "int", default: 1, comment: "投递尝试次数" })
  attempts!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updatedAt!: Date;
}
