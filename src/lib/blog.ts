import { Post, type PostStatus } from "@/entities/Post";
import { getDataSource } from "@/lib/db";

export type PostInput = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  tags: string;
  status: PostStatus;
};

async function getPostRepo() {
  const dataSource = await getDataSource();
  return dataSource.getRepository(Post);
}

function normalizeInput(input: PostInput): PostInput {
  const title = input.title.trim();
  const slug = input.slug.trim().toLowerCase();
  const content = input.content.trim();
  const status: PostStatus = input.status === "published" ? "published" : "draft";

  if (!title || title.length > 200) throw new Error("文章标题长度应为 1–200 个字符");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug 只能包含小写字母、数字和连字符");
  }
  if (!content) throw new Error("请输入文章正文");

  return {
    title,
    slug,
    content,
    status,
    summary: input.summary.trim().slice(0, 500),
    category: input.category.trim().slice(0, 100) || "技术随笔",
    tags: input.tags.trim().slice(0, 500),
  };
}

export async function listPosts() {
  const repo = await getPostRepo();
  return repo.find({ order: { updatedAt: "DESC" } });
}

export async function createPost(input: PostInput) {
  const repo = await getPostRepo();
  const data = normalizeInput(input);
  if (await repo.findOne({ where: { slug: data.slug } })) throw new Error("该 Slug 已被使用");

  return repo.save(
    repo.create({
      ...data,
      publishedAt: data.status === "published" ? new Date() : null,
    }),
  );
}

export async function updatePost(id: number, input: PostInput) {
  const repo = await getPostRepo();
  const post = await repo.findOne({ where: { id } });
  if (!post) throw new Error("文章不存在");

  const data = normalizeInput(input);
  const slugOwner = await repo.findOne({ where: { slug: data.slug } });
  if (slugOwner && Number(slugOwner.id) !== Number(id)) throw new Error("该 Slug 已被使用");

  const isFirstPublish = post.status !== "published" && data.status === "published";
  Object.assign(post, data, {
    publishedAt: isFirstPublish ? new Date() : post.publishedAt,
  });
  return repo.save(post);
}

export async function deletePost(id: number) {
  const repo = await getPostRepo();
  const post = await repo.findOne({ where: { id } });
  if (!post) throw new Error("文章不存在");
  await repo.remove(post);
}
