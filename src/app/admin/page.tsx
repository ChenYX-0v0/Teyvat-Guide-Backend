import "reflect-metadata";
import { listPosts } from "@/lib/blog";
import { BlogDashboard } from "./BlogDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const posts = await listPosts();
  const rows = posts.map((post) => ({
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

  return <BlogDashboard posts={rows} />;
}
