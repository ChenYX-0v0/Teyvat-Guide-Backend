"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { listFailed } from "@/lib/notifications";
import { retryFailedNotifications } from "@/lib/teyvat/assets";
import { TEYVAT_PROJECT_CODE } from "@/lib/teyvat/db";

export type NotificationRow = {
  id: number;
  action: string;
  httpStatus: number | null;
  message: string;
  attempts: number;
  createdAt: string;
};

/** 查询未送达的通知记录 */
export async function listNotificationsAction(): Promise<NotificationRow[]> {
  await requireAdmin();
  const rows = await listFailed(TEYVAT_PROJECT_CODE);
  return rows.map((row) => ({
    id: Number(row.id),
    action: row.action,
    httpStatus: row.httpStatus,
    message: row.message,
    attempts: Number(row.attempts),
    createdAt: new Date(row.createdAt).toLocaleString("zh-CN"),
  }));
}

/** 重试全部未送达通知 */
export async function retryNotificationsAction() {
  await requireAdmin();
  const result = await retryFailedNotifications();
  revalidatePath("/admin");
  return result;
}
