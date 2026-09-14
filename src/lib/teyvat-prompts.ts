import "server-only";
import { callTeyvatInternal, type InternalResult } from "@/lib/teyvat-internal";

/**
 * teyvat-guide 内网「AI 提示词」接口客户端（后台可运营）。
 * 契约（shared-docs/03-主服务对接说明.md §5.2）：
 *   GET  /internal/v1/admin/ai-prompts        → { items, servedScenes }（**含未启用版本**）
 *   POST /internal/v1/admin/ai-prompts        → 新增一版，body { sceneKey, content, remark?, enabled? }
 *   PUT  /internal/v1/admin/ai-prompts/{id}   → 启用 / 停用，body { enabled }
 *
 * 三条口径：
 * 1. **内容不可变**：没有"改内容"接口——改动一律"新增一版"，老版本原样留档可回滚；
 * 2. **版本号由主服务分配**（当前最大版本 + 1），前端不要传；
 * 3. **生效 = 启用且版本最高**：停用当前生效版本就是回滚，会自动回落到上一启用版本。
 *
 * 生效延迟：AI 服务对提示词有 60s 缓存（`PROMPT_STORE_CACHE_TTL`），改完**最迟 1 分钟**生效，
 * 不需要重启任何服务。
 */

export type AIPromptItem = {
  id: number;
  sceneKey: string;
  version: number;
  enabled: boolean;
  remark: string;
  content: string;
  /** 该场景是否会被 AI 服务真正读取（不在白名单里的场景可入库，但当前不生效） */
  served: boolean;
  /** 是否就是该场景当前生效版本（启用且版本最高） */
  effective: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AIPromptList = {
  items: AIPromptItem[];
  /** AI 服务当前会读取的场景，**顺序即拼接顺序** */
  servedScenes: string[];
};

export type AIPromptCreateInput = {
  sceneKey: string;
  content: string;
  remark?: string;
  /** 省略 = 启用（新增即可能生效）；false = 先入库不发 */
  enabled?: boolean;
};

export async function fetchAIPrompts(): Promise<InternalResult<AIPromptList>> {
  return callTeyvatInternal<AIPromptList>("/internal/v1/admin/ai-prompts");
}

export async function createAIPrompt(input: AIPromptCreateInput): Promise<InternalResult<AIPromptItem>> {
  return callTeyvatInternal<AIPromptItem>("/internal/v1/admin/ai-prompts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function setAIPromptEnabled(id: number, enabled: boolean): Promise<InternalResult<AIPromptItem>> {
  return callTeyvatInternal<AIPromptItem>(`/internal/v1/admin/ai-prompts/${id}`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
}
