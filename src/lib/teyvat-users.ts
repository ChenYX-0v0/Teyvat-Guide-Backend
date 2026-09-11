import "server-only";
import { findEnabledProject } from "@/lib/projects";

/**
 * teyvat-guide 内网用户管理接口客户端（服务端 → 服务端直连）。
 * 浏览器永远不接触该接口与密钥；鉴权使用独立的 X-Internal-Key
 * （环境变量 PROJECT_TEYVAT_GUIDE_INTERNAL_KEY），与 X-Admin-Key / 用户 JWT 严格区分。
 *
 * 契约（由 teyvat-guide 主服务实现，统一信封 {code,message,data}）：
 *   GET  /internal/v1/admin/users?keyword=&page=&pageSize=
 *        data: { items: UserItem[], total, page, pageSize }
 *   POST /internal/v1/admin/users/status   body: { id, banned }
 *        data: null
 */

const PROJECT_CODE = "teyvat-guide";
const INTERNAL_TIMEOUT_MS = 10000;

export type TeyvatUserItem = {
  id: number;
  username: string;
  displayName: string;
  genshinUid: string | null;
  status: "active" | "banned";
  createdAt: string;
  lastLoginAt: string | null;
  totalTokens: number;
};

export type UserPage = {
  items: TeyvatUserItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type InternalResult<T> = {
  success: boolean;
  message: string;
  data?: T;
  /** 接口未就绪（404 / 未配置密钥 / 网络不可达）时为 true，供页面给出明确提示 */
  notReady: boolean;
};

function internalKey(): string | null {
  const envName = `PROJECT_${PROJECT_CODE.replace(/-/g, "_").toUpperCase()}_INTERNAL_KEY`;
  return process.env[envName] ?? null;
}

async function callInternal<T>(path: string, init: RequestInit = {}): Promise<InternalResult<T>> {
  const project = await findEnabledProject(PROJECT_CODE);
  if (!project) {
    return { success: false, message: "项目不存在或未启用", notReady: true };
  }
  const key = internalKey();
  if (!key) {
    return { success: false, message: "未配置内网密钥 PROJECT_TEYVAT_GUIDE_INTERNAL_KEY", notReady: true };
  }

  const headers = new Headers({ Accept: "application/json", "X-Internal-Key": key });
  if (init.body) headers.set("Content-Type", "application/json");
  const url = `${project.baseUrl.replace(/\/+$/, "")}${path}`;

  try {
    const response = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(INTERNAL_TIMEOUT_MS) });
    const payload = (await response.json().catch(() => null)) as { code?: number; message?: string; data?: T } | null;

    if (response.status === 404) {
      return { success: false, message: "内网接口尚未实现（404），请在 web 服务器按契约实现 /internal/v1/admin/*", notReady: true };
    }
    if (!response.ok || !payload || payload.code !== 0) {
      const message = payload?.message || `内网接口调用失败（HTTP ${response.status}）`;
      return { success: false, message, notReady: response.status === 401 || response.status === 403 };
    }
    return { success: true, message: "ok", data: payload.data, notReady: false };
  } catch {
    console.error(`[teyvat-users] 内网接口不可达 | url=${url} | 时间=${new Date().toISOString()}`);
    return { success: false, message: "web 服务器不可达", notReady: true };
  }
}

export async function fetchUsers(params: { keyword?: string; page?: number; pageSize?: number }): Promise<InternalResult<UserPage>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 20));
  return callInternal<UserPage>(`/internal/v1/admin/users?${query.toString()}`);
}

export async function setUserBanned(id: number, banned: boolean): Promise<InternalResult<null>> {
  return callInternal<null>("/internal/v1/admin/users/status", {
    method: "POST",
    body: JSON.stringify({ id, banned }),
  });
}
