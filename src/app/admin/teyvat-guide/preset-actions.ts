"use server";

import { requireAdmin } from "@/lib/session";
import {
  createPresetQa,
  fetchPresetQa,
  updatePresetQa,
  type PresetQAItem,
  type PresetQASaveInput,
} from "@/lib/teyvat-presets";

export type PresetQARow = PresetQAItem;
export type PresetQASavePayload = PresetQASaveInput;

export type PresetQAListResult = {
  success: boolean;
  message: string;
  notReady: boolean;
  items: PresetQARow[];
};

export type PresetQASaveResult = {
  success: boolean;
  message: string;
  item: PresetQARow | null;
};

export async function listPresetQaAction(): Promise<PresetQAListResult> {
  await requireAdmin();
  const result = await fetchPresetQa();
  if (!result.success || !result.data) {
    return { success: false, message: result.message, notReady: result.notReady, items: [] };
  }
  return { success: true, message: "ok", notReady: false, items: result.data.items };
}

export async function createPresetQaAction(input: PresetQASavePayload): Promise<PresetQASaveResult> {
  await requireAdmin();
  const result = await createPresetQa(input);
  if (!result.success || !result.data) {
    return { success: false, message: result.message, item: null };
  }
  return { success: true, message: "ok", item: result.data };
}

export async function updatePresetQaAction(id: number, input: PresetQASavePayload): Promise<PresetQASaveResult> {
  await requireAdmin();
  const result = await updatePresetQa(id, input);
  if (!result.success || !result.data) {
    return { success: false, message: result.message, item: null };
  }
  return { success: true, message: "ok", item: result.data };
}
