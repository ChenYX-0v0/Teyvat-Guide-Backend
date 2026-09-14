"use server";

import { requireAdmin } from "@/lib/session";
import {
  createAIPrompt,
  fetchAIPrompts,
  setAIPromptEnabled,
  type AIPromptCreateInput,
  type AIPromptItem,
} from "@/lib/teyvat-prompts";

export type PromptRow = AIPromptItem;
export type PromptCreatePayload = AIPromptCreateInput;

export type PromptListResult = {
  success: boolean;
  message: string;
  notReady: boolean;
  items: PromptRow[];
  servedScenes: string[];
};

export type PromptSaveResult = {
  success: boolean;
  message: string;
  item: PromptRow | null;
};

export async function listPromptsAction(): Promise<PromptListResult> {
  await requireAdmin();
  const result = await fetchAIPrompts();
  if (!result.success || !result.data) {
    return {
      success: false,
      message: result.message,
      notReady: result.notReady,
      items: [],
      servedScenes: [],
    };
  }
  return {
    success: true,
    message: "ok",
    notReady: false,
    items: result.data.items,
    servedScenes: result.data.servedScenes,
  };
}

export async function createPromptAction(input: PromptCreatePayload): Promise<PromptSaveResult> {
  await requireAdmin();
  const result = await createAIPrompt(input);
  if (!result.success || !result.data) {
    return { success: false, message: result.message, item: null };
  }
  return { success: true, message: "ok", item: result.data };
}

export async function setPromptEnabledAction(id: number, enabled: boolean): Promise<PromptSaveResult> {
  await requireAdmin();
  const result = await setAIPromptEnabled(id, enabled);
  if (!result.success || !result.data) {
    return { success: false, message: result.message, item: null };
  }
  return { success: true, message: "ok", item: result.data };
}
