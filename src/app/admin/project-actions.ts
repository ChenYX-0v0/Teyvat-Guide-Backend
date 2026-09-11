"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { listFailed } from "@/lib/notifications";
import { retryFailedNotifications } from "@/lib/teyvat/assets";

export type NotificationRow = {
  id: number;
  action: string;
  httpStatus: number | null;
  message: string;
  attempts: number;
  createdAt: string;
};

/** 查询指定项目的未送达通知记录 */
export async function listProjectNotificationsAction(projectCode: string): Promise<NotificationRow[]> {
  await requireAdmin();
  const rows = await listFailed(projectCode);
  return rows.map((row) => ({
    id: Number(row.id),
    action: row.action,
    httpStatus: row.httpStatus,
    message: row.message,
    attempts: Number(row.attempts),
    createdAt: new Date(row.createdAt).toLocaleString("zh-CN"),
  }));
}

/** 重试指定项目的未送达通知 */
export async function retryProjectNotificationsAction(projectCode: string) {
  await requireAdmin();
  const result = await retryFailedNotifications(projectCode);
  revalidatePath("/admin");
  return result;
}
