import "server-only";
import { ManagedProject } from "@/entities";
import { getDataSource } from "@/lib/db";

export const PROJECT_CODE_PATTERN = /^[a-z0-9-]+$/;

/** 按 code 查找已启用的接入项目，非法 code 或未启用返回 null */
export async function findEnabledProject(code: string): Promise<ManagedProject | null> {
  if (!PROJECT_CODE_PATTERN.test(code)) return null;
  const ds = await getDataSource();
  const project = await ds.getRepository(ManagedProject).findOne({ where: { code } });
  return project && project.status === "enabled" ? project : null;
}

/** 解析项目凭证：优先环境变量 PROJECT_<CODE>_ADMIN_KEY，其次注册表 auth_config */
export function resolveProjectCredential(project: ManagedProject): string | null {
  if (project.authType === "none") return null;
  const envName = `PROJECT_${project.code.replace(/-/g, "_").toUpperCase()}_ADMIN_KEY`;
  return process.env[envName] ?? project.authConfig ?? null;
}

/** 按项目鉴权方式写入请求头；header-key 使用项目配置的头名（默认 X-Admin-Key） */
export function applyProjectAuthHeaders(project: ManagedProject, headers: Headers) {
  const credential = resolveProjectCredential(project);
  if (!credential) return;
  if (project.authType === "header-key") headers.set(project.authHeader || "X-Admin-Key", credential);
  if (project.authType === "bearer") headers.set("Authorization", `Bearer ${credential}`);
}
