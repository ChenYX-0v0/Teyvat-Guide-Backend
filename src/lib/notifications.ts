import "server-only";
import { ProjectNotification } from "@/entities";
import { getDataSource } from "@/lib/db";

export type NotificationInput = {
  projectCode: string;
  action: string;
  httpStatus: number | null;
  message: string;
};

/** 记录一次失败的通知投递 */
export async function recordFailure(input: NotificationInput) {
  const ds = await getDataSource();
  await ds.getRepository(ProjectNotification).save(
    ds.getRepository(ProjectNotification).create({ ...input, status: "failed", attempts: 1 }),
  );
}

/** 查询待重试（未送达）的通知，按时间倒序 */
export async function listFailed(projectCode: string, limit = 50) {
  const ds = await getDataSource();
  return ds.getRepository(ProjectNotification).find({
    where: { projectCode, status: "failed" },
    order: { createdAt: "DESC" },
    take: limit,
  });
}

/** 标记通知已送达 */
export async function markSent(id: number) {
  const ds = await getDataSource();
  await ds.getRepository(ProjectNotification).update({ id }, { status: "sent" });
}

/** 重试后仍失败：累加次数并更新原因 */
export async function recordRetryFailure(id: number, httpStatus: number | null, message: string) {
  const ds = await getDataSource();
  const repo = ds.getRepository(ProjectNotification);
  const existing = await repo.findOne({ where: { id } });
  if (!existing) return;
  existing.attempts += 1;
  existing.httpStatus = httpStatus;
  existing.message = message;
  await repo.save(existing);
}
