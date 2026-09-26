import "server-only";
import { findEnabledProject } from "@/lib/projects";

/**
 * teyvat-guide 内网管理接口的通用客户端（服务端 → 服务端直连）。
 * 浏览器永远不接触这些接口与密钥；鉴权使用独立的 X-Internal-Key
 * （环境变量 PROJECT_TEYVAT_GUIDE_INTERNAL_KEY），与 X-Admin-Key / 用户 JWT 严格区分。
 *
 * 契约由 teyvat-guide 主服务实现（统一信封 {code,message,data}）：
 *   shared-docs/04-用户体系与鉴权边界设计.md（用户）
 *   docs/06-对话记录查看设计.md（对话记录）
 */

const PROJECT_CODE = "teyvat-guide";
const INTERNAL_TIMEOUT_MS = 10000;

export type InternalResult<T> = {
  success: boolean;
  message: string;
  data?: T;
  /** 接口未就绪（路由不存在 / 未配置密钥 / 网络不可达）时为 true，供页面给出明确提示 */
  notReady: boolean;
};

function internalKey(): string | null {
  const envName = `PROJECT_${PROJECT_CODE.replace(/-/g, "_").toUpperCase()}_INTERNAL_KEY`;
  return process.env[envName] ?? null;
}

/**
 * 取**文本**响应的变体（目前只有「使用统计导出 CSV」用得到 —— 它返回 text/csv 而不是统一信封，
 * 走 callTeyvatInternal 会被判成"接口未就绪"）。
 */
export async function callTeyvatInternalText(path: string): Promise<{ success: boolean; message: string; text?: string }> {
  const project = await findEnabledProject(PROJECT_CODE);
  if (!project) return { success: false, message: "项目不存在或未启用" };
  const key = internalKey();
  if (!key) return { success: false, message: "未配置内网密钥 PROJECT_TEYVAT_GUIDE_INTERNAL_KEY" };

  try {
    const url = `${project.baseUrl.replace(/\/+$/, "")}${path}`;
    const response = await fetch(url, {
      headers: { Accept: "text/csv", "X-Internal-Key": key },
      signal: AbortSignal.timeout(INTERNAL_TIMEOUT_MS),
    });
    if (!response.ok) return { success: false, message: `导出失败（HTTP ${response.status}）` };
    return { success: true, message: "ok", text: await response.text() };
  } catch {
    return { success: false, message: "web 服务器不可达" };
  }
}

export async function callTeyvatInternal<T>(path: string, init: RequestInit = {}): Promise<InternalResult<T>> {
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

    if (!payload || payload.code === undefined) {
      // 拿不到统一信封：说明路由根本不存在（接口未实现）或返回了非 JSON（网关错误页）
      return { success: false, message: `内网接口未就绪（HTTP ${response.status}）`, notReady: true };
    }
    if (!response.ok || payload.code !== 0) {
      // 有信封说明接口存在：区分「资源不存在/参数错误」与「鉴权失败/未配置」
      const notReady = response.status === 401 || response.status === 403;
      return {
        success: false,
        message: payload.message || `内网接口调用失败（HTTP ${response.status}）`,
        notReady,
      };
    }
    return { success: true, message: "ok", data: payload.data, notReady: false };
  } catch {
    console.error(`[teyvat-internal] 内网接口不可达 | url=${url} | 时间=${new Date().toISOString()}`);
    return { success: false, message: "web 服务器不可达", notReady: true };
  }
}
