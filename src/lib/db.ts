import "reflect-metadata";
import { DataSource } from "typeorm";
import { ManagedProject, PhoneVerificationCode, Post, ProjectNotification, User, UserSession } from "@/entities";

const dataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "root",
  database: process.env.DB_NAME ?? "demo_project",
  entities: [User, Post, PhoneVerificationCode, UserSession, ManagedProject, ProjectNotification],
  synchronize: false,
  logging: true,
});

export async function getDataSource() {
  if (!dataSource.isInitialized) {
    console.log(`[db] 初始化 DataSource | host=${process.env.DB_HOST ?? "127.0.0.1"} database=${process.env.DB_NAME ?? "demo_project"} | 时间=${new Date().toISOString()}`);
    await dataSource.initialize();
    console.log(`[db] DataSource 已连接 | isInitialized=${dataSource.isInitialized}`);
  }
  return dataSource;
}
