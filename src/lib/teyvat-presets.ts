import "server-only";
import { callTeyvatInternal, type InternalResult } from "@/lib/teyvat-internal";

/**
 * teyvat-guide 内网「预设问答」接口客户端（后台可运营）。
 * 契约（docs/04-API接口文档.md §7.3）：
 *   GET  /internal/v1/admin/preset-qa        → { items: PresetQAItem[] }（**含已下架**）
 *   POST /internal/v1/admin/preset-qa        → 新建，body { sceneKey, question, answer, sort, enabled? }
 *   PUT  /internal/v1/admin/preset-qa/{id}   → 整体覆盖（enabled 省略 = 保持原值）
 *
 * 口径：**不做物理删除**——下架只需 `enabled=false`，C 端立刻不再展示，后台仍可编辑恢复。
 * 预设问答是匿名用户在对话页看到的内容（不调模型、不消耗 token），见 shared-docs/05 §1。
 */

export type PresetQAItem = {
  id: number;
  sceneKey: string;
  question: string;
  answer: string;
  sort: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PresetQAList = {
  items: PresetQAItem[];
};

export type PresetQASaveInput = {
  sceneKey: string;
  question: string;
  answer: string;
  sort: number;
  /** 省略：新建时默认启用；更新时保持原值 */
  enabled?: boolean;
};

export async function fetchPresetQa(): Promise<InternalResult<PresetQAList>> {
  return callTeyvatInternal<PresetQAList>("/internal/v1/admin/preset-qa");
}

export async function createPresetQa(input: PresetQASaveInput): Promise<InternalResult<PresetQAItem>> {
  return callTeyvatInternal<PresetQAItem>("/internal/v1/admin/preset-qa", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePresetQa(id: number, input: PresetQASaveInput): Promise<InternalResult<PresetQAItem>> {
  return callTeyvatInternal<PresetQAItem>(`/internal/v1/admin/preset-qa/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
