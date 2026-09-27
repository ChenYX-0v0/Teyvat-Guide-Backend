import "server-only";
import { applyProjectAuthHeaders, findEnabledProject } from "@/lib/projects";
import { listFailed, markSent, recordFailure, recordRetryFailure } from "@/lib/notifications";
import { getTeyvatDataSource, TEYVAT_PROJECT_CODE } from "./db";
import {
  TeyvatCharacter,
  TeyvatCharacterStatWeight,
  TeyvatMissing,
  TeyvatPropMap,
  TeyvatRelicSet,
  TeyvatRelicSetEffect,
  TeyvatWeapon,
  type StatWeightPayload,
} from "./entities";

/** 映射数据写入后的副作用结果（供页面提示） */
export type SyncResult = {
  reloaded: boolean;
  snapshotsCleared: boolean;
  message: string;
};

export type CharacterInput = {
  id: number;
  name: string;
  enName: string;
  element: string;
  rarity: number;
  icon: string;
};

export type WeaponInput = {
  id: number;
  name: string;
  enName: string;
  rarity: number;
  type: string;
  icon: string;
};

export type RelicSetInput = {
  setId: number;
  name: string;
  icon: string;
};

/** 套装某个件数的效果文本（piece 只允许 2 / 4） */
export type RelicSetEffectInput = {
  setId: number;
  piece: number;
  effect: string;
  source: string;
};

/* ------------------------------- 查询 ------------------------------- */

export async function listCharacters() {
  const ds = await getTeyvatDataSource();
  return ds.getRepository(TeyvatCharacter).find({ order: { id: "ASC" } });
}

export async function listWeapons() {
  const ds = await getTeyvatDataSource();
  return ds.getRepository(TeyvatWeapon).find({ order: { id: "ASC" } });
}

export async function listRelicSets() {
  const ds = await getTeyvatDataSource();
  return ds.getRepository(TeyvatRelicSet).find({ order: { setId: "ASC" } });
}

/** 套装 2/4 件效果（按套装、件数排序）——后台「套装效果」页签用 */
export async function listRelicSetEffects() {
  const ds = await getTeyvatDataSource();
  return ds.getRepository(TeyvatRelicSetEffect).find({ order: { setId: "ASC", piece: "ASC" } });
}

/** 翻译缺漏清单，按命中次数倒序 */
export async function listMissings(limit = 200) {
  const ds = await getTeyvatDataSource();
  return ds
    .getRepository(TeyvatMissing)
    .createQueryBuilder("m")
    .orderBy("m.hit_count", "DESC")
    .limit(limit)
    .getMany();
}

/** 词条映射（propId → 中文名），供推荐属性编辑器下拉选择 */
export async function listPropMaps() {
  const ds = await getTeyvatDataSource();
  return ds.getRepository(TeyvatPropMap).find({ order: { propId: "ASC" } });
}

/** 全部角色的推荐属性配置 */
export async function listCharacterStatWeights() {
  const ds = await getTeyvatDataSource();
  return ds.getRepository(TeyvatCharacterStatWeight).find();
}

// 注：评分权重已并入 `character_stat_weights.payload.score`（2026-09-27 合并 ✓）⇒
// 它随 `listCharacterStatWeights()` 一起下发，**不需要**单独查 `character_relic_weights_mp`
// （该表由服务端做过渡兜底 ✓，后台不再读它）。

// 注：条件规则（character_relic_weight_rules）**不参与算分**（2026-09-27 用户决定 ✗），
// 后台也不再展示 ⇒ 这里不再提供读取（实体已删；库表与种子数据保留仅供参考 ✓）。

/* --------------------------- 写入（upsert） --------------------------- */

export async function saveCharacter(input: CharacterInput) {
  const repo = (await getTeyvatDataSource()).getRepository(TeyvatCharacter);
  const existing = await repo.findOne({ where: { id: input.id } });
  await repo.save(existing ? Object.assign(existing, input) : repo.create(input));
}

export async function removeCharacter(id: number) {
  const ds = await getTeyvatDataSource();
  await ds.getRepository(TeyvatCharacter).delete({ id });
}

export async function saveWeapon(input: WeaponInput) {
  const repo = (await getTeyvatDataSource()).getRepository(TeyvatWeapon);
  const existing = await repo.findOne({ where: { id: input.id } });
  await repo.save(existing ? Object.assign(existing, input) : repo.create(input));
}

export async function removeWeapon(id: number) {
  const ds = await getTeyvatDataSource();
  await ds.getRepository(TeyvatWeapon).delete({ id });
}

export async function saveRelicSet(input: RelicSetInput) {
  const repo = (await getTeyvatDataSource()).getRepository(TeyvatRelicSet);
  const existing = await repo.findOne({ where: { setId: input.setId } });
  await repo.save(existing ? Object.assign(existing, input) : repo.create(input));
}

export async function removeRelicSet(setId: number) {
  const ds = await getTeyvatDataSource();
  await ds.getRepository(TeyvatRelicSet).delete({ setId });
}

/** 保存某套装某个件数的效果文本（主键 upsert：一个套装一个件数只有一条） */
export async function saveRelicSetEffect(input: RelicSetEffectInput) {
  const repo = (await getTeyvatDataSource()).getRepository(TeyvatRelicSetEffect);
  const existing = await repo.findOne({ where: { setId: input.setId, piece: input.piece } });
  await repo.save(existing ? Object.assign(existing, input) : repo.create(input));
}

/**
 * 一次保存某个套装的 2 / 4 件文本：文本留空 = 删掉该件数那条。
 * 留空即删除是刻意的——AI 侧对「查不到」会如实说「本服暂无该套装的效果资料」，
 * 比留着一条错文本安全（与 V2.3「资料外不编造」同一套口径）。
 */
export async function saveRelicSetEffects(setId: number, texts: { piece2: string; piece4: string }, source: string) {
  const pairs: Array<[number, string]> = [
    [2, texts.piece2],
    [4, texts.piece4],
  ];
  for (const [piece, raw] of pairs) {
    const effect = raw.trim();
    if (effect) {
      await saveRelicSetEffect({ setId, piece, effect, source });
    } else {
      await removeRelicSetEffect(setId, piece);
    }
  }
}

/** 删除某套装某个件数的效果 */
export async function removeRelicSetEffect(setId: number, piece: number) {
  const ds = await getTeyvatDataSource();
  await ds.getRepository(TeyvatRelicSetEffect).delete({ setId, piece });
}

/** 删除某套装的全部效果（2 与 4 一起） */
export async function removeRelicSetEffects(setId: number) {
  const ds = await getTeyvatDataSource();
  await ds.getRepository(TeyvatRelicSetEffect).delete({ setId });
}

/** 保存角色的推荐属性 payload（先查后更，避免显式主键冲突） */
export async function saveCharacterStatWeight(characterId: number, payload: StatWeightPayload) {
  const repo = (await getTeyvatDataSource()).getRepository(TeyvatCharacterStatWeight);
  const existing = await repo.findOne({ where: { characterId } });
  if (existing) {
    await repo.save(Object.assign(existing, { payload }));
  } else {
    await repo.save(repo.create({ characterId, payload }));
  }
}

/* --------------------------- 缓存同步副作用 --------------------------- */

/** 清空玩家档案快照（旧快照不含新翻译） */
async function clearProfileSnapshots() {
  const ds = await getTeyvatDataSource();
  await ds.query("DELETE FROM player_profile_snapshots");
}

type ReloadAttempt = { ok: boolean; httpStatus: number | null; message: string };

/** 实际发起一次 reload 请求（走网关同一套凭证），返回原始结果，不落库 */
async function attemptReload(baseUrl: string, code: string): Promise<ReloadAttempt> {
  const project = await findEnabledProject(code);
  if (!project) {
    return { ok: false, httpStatus: null, message: "项目不存在或未启用" };
  }
  const headers = new Headers({ Accept: "application/json" });
  applyProjectAuthHeaders(project, headers);
  const url = `${baseUrl.replace(/\/+$/, "")}/api/admin/assets/reload?purgeSnapshots=true`;
  try {
    const response = await fetch(url, { method: "POST", headers, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      const body = (await response.text()).slice(0, 200);
      console.error(`[teyvat-assets] 内存刷新失败 | url=${url} status=${response.status} body=${body} | 时间=${new Date().toISOString()}`);
      if (response.status === 401 || response.status === 403) {
        return { ok: false, httpStatus: response.status, message: "内存刷新被拒绝（凭证无效），请检查 PROJECT_TEYVAT_GUIDE_ADMIN_KEY" };
      }
      return { ok: false, httpStatus: response.status, message: `内存刷新失败（HTTP ${response.status}）` };
    }
    return { ok: true, httpStatus: response.status, message: "已刷新内存，档案快照已清空" };
  } catch {
    return { ok: false, httpStatus: null, message: "teyvatGuide 服务不可达" };
  }
}

/**
 * 通知 teyvatGuide 刷新内存映射。失败时写入通知记录（供服务状态页重试）。
 */
async function reloadMemory(): Promise<{ reloaded: boolean; message: string }> {
  const project = await findEnabledProject(TEYVAT_PROJECT_CODE);
  if (!project) {
    return { reloaded: false, message: "项目未启用，未刷新内存" };
  }
  const attempt = await attemptReload(project.baseUrl, TEYVAT_PROJECT_CODE);
  if (attempt.ok) {
    return { reloaded: true, message: "已保存并刷新内存，档案快照已清空" };
  }
  try {
    await recordFailure({ projectCode: TEYVAT_PROJECT_CODE, action: "assets.reload", httpStatus: attempt.httpStatus, message: attempt.message });
  } catch (error) {
    console.error(`[teyvat-assets] 写入通知记录失败 | err=${error instanceof Error ? error.message : String(error)} | 时间=${new Date().toISOString()}`);
  }
  return { reloaded: false, message: `${attempt.message}，数据已入库` };
}

/**
 * 映射数据变更后的统一同步动作：刷新内存（服务端同时清快照）。
 * reload 成功即视为快照已清；失败时兜底直接 DELETE 快照表。
 * 任何一步失败都不影响已入库的数据，仅返回提示信息。
 */
export async function syncAfterAssetChange(): Promise<SyncResult> {
  const reload = await reloadMemory();
  if (reload.reloaded) {
    return { reloaded: true, snapshotsCleared: true, message: reload.message };
  }

  // reload 未成功，兜底直接清空快照，至少保证旧翻译不残留
  let snapshotsCleared = false;
  try {
    await clearProfileSnapshots();
    snapshotsCleared = true;
  } catch (error) {
    console.error(`[teyvat-assets] 兜底清空快照失败 | err=${error instanceof Error ? error.message : String(error)} | 时间=${new Date().toISOString()}`);
  }
  return { reloaded: false, snapshotsCleared, message: reload.message };
}

/* --------------------------- 通知补发 --------------------------- */

export type RetryResult = { retried: number; succeeded: number; failed: number };

/** 重试指定项目所有未送达的通知；成功的标记为 sent，失败的累加尝试次数 */
export async function retryFailedNotifications(projectCode: string = TEYVAT_PROJECT_CODE): Promise<RetryResult> {
  const project = await findEnabledProject(projectCode);
  const pending = await listFailed(projectCode);
  let succeeded = 0;
  let failed = 0;

  for (const item of pending) {
    if (!project) {
      await recordRetryFailure(item.id, null, "项目不存在或未启用");
      failed += 1;
      continue;
    }
    const attempt = await attemptReload(project.baseUrl, projectCode);
    if (attempt.ok) {
      await markSent(item.id);
      succeeded += 1;
    } else {
      await recordRetryFailure(item.id, attempt.httpStatus, attempt.message);
      failed += 1;
    }
  }

  return { retried: pending.length, succeeded, failed };
}
