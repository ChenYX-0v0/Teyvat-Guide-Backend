import "server-only";
import { callTeyvatInternal, type InternalResult } from "@/lib/teyvat-internal";

/**
 * teyvat-guide 内网「邀请码管理」客户端（2026-10-12 新增）。
 *
 * 契约由主服务实现（`server/internal/handler/internal_invite.go`，统一信封 {code,message,data}）：
 *   GET  /internal/v1/admin/invite-codes?unused=&limit=
 *        data: { items: InviteCodeItem[], usable, total }
 *   POST /internal/v1/admin/invite-codes   body: { note?, count? }
 *        data: { items: InviteCodeItem[], codes: string[] }   ← **明文码只在这里出现一次** ✓
 *   PUT  /internal/v1/admin/invite-codes/:code   body: { enabled }
 *        data: { code, enabled }
 *
 * ⚠️ 与前几个模块同一口径：**密钥只留在服务端**（`PROJECT_TEYVAT_GUIDE_INTERNAL_KEY` ✓），
 * 浏览器永远接触不到内网接口与密钥 ✓。
 *
 * 为什么需要这个页面（业务口径，见 `teyvat-docs/shared/04` §2.5 与 `deploy/README` §3.9）：
 *   邀请码是**注册的第二道门**（第一道是短信验证码 ✓）——**一次性的** ✓、
 *   **发短信前先验码**（码不对一条短信都不发、不花钱 ✓）、
 *   **作废发生在注册成功那一刻**（注册失败不烧码 ✓）、
 *   **停用 = 收回但不删行**（留痕便于对账 ✓）。
 */

/** 与主服务 `model.InviteCode` 的 JSON 一一对应 ✓（omitempty 字段没值时不出现 ✓） */
export type TeyvatInviteCode = {
  code: string;
  note?: string;
  /** false = 已停用（收回，不删行 ✓） */
  enabled: boolean;
  /** 为空 = 未使用 —— 这是"是否作废"的**唯一判据** ✓ */
  usedAt?: string;
  /** 核销出来的用户 ID（留痕便于排查"这号是谁放进来的" ✓） */
  usedBy?: number;
  usedPhone?: string;
  createdAt: string;
  updatedAt: string;
};

export type InviteCodePage = {
  items: TeyvatInviteCode[];
  /** 可用码总数（启用 且 未使用 ✓）—— 后台一眼看还剩几张入场券 */
  usable: number;
  total: number;
};

export type CreatedInviteCodes = {
  items: TeyvatInviteCode[];
  /** 明文码（生成接口的响应里才有 ✓） */
  codes: string[];
};

export async function fetchInviteCodes(
  unused: boolean,
  limit = 200,
): Promise<InternalResult<InviteCodePage>> {
  const query = new URLSearchParams();
  if (unused) query.set("unused", "true");
  query.set("limit", String(limit));
  return callTeyvatInternal<InviteCodePage>(`/internal/v1/admin/invite-codes?${query.toString()}`);
}

/** 生成一批码（`count` 缺省 1 ✓）；返回体里带**明文码**，页面要提示"只显示这一次" ✓ */
export async function createInviteCodes(
  note: string,
  count: number,
): Promise<InternalResult<CreatedInviteCodes>> {
  return callTeyvatInternal<CreatedInviteCodes>("/internal/v1/admin/invite-codes", {
    method: "POST",
    body: JSON.stringify({ note, count }),
  });
}

/** 停用 / 重新启用（**不删行** ✓） */
export async function setInviteCodeEnabled(
  code: string,
  enabled: boolean,
): Promise<InternalResult<{ code: string; enabled: boolean }>> {
  return callTeyvatInternal<{ code: string; enabled: boolean }>(
    `/internal/v1/admin/invite-codes/${encodeURIComponent(code)}`,
    { method: "PUT", body: JSON.stringify({ enabled }) },
  );
}
