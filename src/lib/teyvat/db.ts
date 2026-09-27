import "server-only";
import "reflect-metadata";
import { DataSource } from "typeorm";
import {
  TeyvatCharacter,
  TeyvatCharacterRelicWeightMP,
  TeyvatCharacterStatWeight,
  TeyvatMissing,
  TeyvatPropMap,
  TeyvatRelicSet,
  TeyvatRelicSetEffect,
  TeyvatWeapon,
} from "./entities";

/**
 * teyvatGuide 库的独立数据源。
 * 注意：这是外部 Schema（归 teyvatGuide 的 GORM AutoMigrate 所有），
 * 必须保持 synchronize: false，本系统只读写数据，不迁移结构。
 */
const teyvatDataSource = new DataSource({
  type: "mysql",
  host: process.env.TEYVAT_DB_HOST ?? process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.TEYVAT_DB_PORT ?? process.env.DB_PORT ?? 3306),
  username: process.env.TEYVAT_DB_USER ?? process.env.DB_USER ?? "root",
  password: process.env.TEYVAT_DB_PASSWORD ?? process.env.DB_PASSWORD ?? "root",
  database: process.env.TEYVAT_DB_NAME ?? "teyvat_guide",
  entities: [
    TeyvatCharacter,
    TeyvatWeapon,
    TeyvatRelicSet,
    TeyvatRelicSetEffect,
    TeyvatMissing,
    TeyvatCharacterStatWeight,
    TeyvatPropMap,
    // 评分标准（2026-09-27）：权重主键 (角色, 元素)，后台「评分标准」展示。
    // 条件规则表**不注册**——它不参与算分、后台也不展示 ✗（数据仍在库里 ✓）。
    TeyvatCharacterRelicWeightMP,
  ],
  synchronize: false,
  logging: false,
});

export const TEYVAT_PROJECT_CODE = "teyvat-guide";

// 缓存初始化 Promise，避免并发调用时重复 initialize
let initPromise: Promise<DataSource> | null = null;

export function getTeyvatDataSource(): Promise<DataSource> {
  if (!initPromise) {
    initPromise = (async () => {
      if (teyvatDataSource.isInitialized) return teyvatDataSource;
      console.log(
        `[teyvat-db] 初始化 DataSource | host=${process.env.TEYVAT_DB_HOST ?? "127.0.0.1"} database=${process.env.TEYVAT_DB_NAME ?? "teyvat_guide"} | 时间=${new Date().toISOString()}`,
      );
      await teyvatDataSource.initialize();
      console.log(`[teyvat-db] DataSource 已连接 | isInitialized=${teyvatDataSource.isInitialized}`);
      return teyvatDataSource;
    })().catch((error) => {
      initPromise = null; // 失败允许下次重试
      throw error;
    });
  }
  return initPromise;
}
