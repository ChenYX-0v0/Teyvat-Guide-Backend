import "reflect-metadata";
import { listUsers } from "@/lib/auth";
import { listPosts } from "@/lib/blog";
import { requireAdmin } from "@/lib/session";
import { AdminShell } from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await requireAdmin();
  const [posts, accounts] = await Promise.all([listPosts(), listUsers()]);
  const postRows = posts.map((post) => ({
    id: String(post.id),
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    content: post.content,
    category: post.category,
    tags: post.tags,
    status: post.status,
    updatedAt: new Date(post.updatedAt).toLocaleString("zh-CN"),
  }));
  const accountRows = accounts.map((account) => ({
    id: String(account.id),
    username: account.username,
    phone: account.phone,
    permissionLevel: account.permissionLevel,
    createdAt: new Date(account.createdAt).toLocaleString("zh-CN"),
  }));

  return <AdminShell posts={postRows} accounts={accountRows} currentUser={currentUser} />;
}
