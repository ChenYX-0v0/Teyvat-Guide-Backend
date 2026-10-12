"use server";

import { requireAdmin } from "@/lib/session";
import {
  createInviteCodes,
  fetchInviteCodes,
  setInviteCodeEnabled,
  type TeyvatInviteCode,
} from "@/lib/teyvat-invites";

export type InviteRow = TeyvatInviteCode;

export type InviteListResult = {
  success: boolean;
  message: string;
  notReady: boolean;
  items: InviteRow[];
  /** 可用码总数（启用 且 未使用 ✓） */
  usable: number;
};

/** 列表（`unused=true` 只看还能用的 ✓） */
export async function listInviteCodesAction(unused: boolean): Promise<InviteListResult> {
  await requireAdmin();
  const result = await fetchInviteCodes(unused);
  if (!result.success || !result.data) {
    return { success: false, message: result.message, notReady: result.notReady, items: [], usable: 0 };
  }
  return {
    success: true,
    message: "ok",
    notReady: false,
    items: result.data.items,
    usable: result.data.usable,
  };
}

export type CreateInviteResult = {
  success: boolean;
  message: string;
  /** 明文码 —— **只在生成这一刻拿得到** ✓（页面必须提示用户立刻复制 ✗ 不然就没了） */
  codes: string[];
};

export async function createInviteCodesAction(note: string, count: number): Promise<CreateInviteResult> {
  await requireAdmin();
  const result = await createInviteCodes(note, count);
  if (!result.success || !result.data) {
    return { success: false, message: result.message, codes: [] };
  }
  return { success: true, message: "ok", codes: result.data.codes };
}

export async function setInviteEnabledAction(
  code: string,
  enabled: boolean,
): Promise<{ success: boolean; message: string }> {
  await requireAdmin();
  const result = await setInviteCodeEnabled(code, enabled);
  return { success: result.success, message: result.message };
}
