import "reflect-metadata";
import { listUsers } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";
import { AdminShell } from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await requireAdmin();
  const accounts = await listUsers();
  const accountRows = accounts.map((account) => ({
    id: String(account.id),
    username: account.username,
    phone: account.phone,
    permissionLevel: account.permissionLevel,
    createdAt: new Date(account.createdAt).toLocaleString("zh-CN"),
  }));

  return <AdminShell accounts={accountRows} currentUser={currentUser} />;
}
