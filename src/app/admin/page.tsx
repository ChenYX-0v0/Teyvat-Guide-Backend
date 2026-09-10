import "reflect-metadata";
import { listUsers } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";
import { AdminShell } from "./AdminShell";
import { loadAssetsAction } from "./teyvat-guide/asset-actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await requireAdmin();
  const [accounts, teyvatAssets] = await Promise.all([listUsers(), loadAssetsAction()]);
  const accountRows = accounts.map((account) => ({
    id: String(account.id),
    username: account.username,
    phone: account.phone,
    permissionLevel: account.permissionLevel,
    createdAt: new Date(account.createdAt).toLocaleString("zh-CN"),
  }));

  return <AdminShell accounts={accountRows} currentUser={currentUser} teyvatAssets={teyvatAssets} />;
}
