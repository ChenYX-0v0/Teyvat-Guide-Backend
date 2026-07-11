"use server";

import { revalidatePath } from "next/cache";
import { createPost, deletePost, updatePost, type PostInput } from "@/lib/blog";
import { requireAdmin } from "@/lib/session";

export type PostActionResult = { error?: string };

function readPostInput(formData: FormData): PostInput {
  return {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    content: String(formData.get("content") ?? ""),
    category: String(formData.get("category") ?? ""),
    tags: String(formData.get("tags") ?? ""),
    status: formData.get("status") === "published" ? "published" : "draft",
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后重试";
}

export async function createPostAction(formData: FormData): Promise<PostActionResult> {
  try {
    await createPost(readPostInput(formData));
    revalidatePath("/admin");
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function updatePostAction(formData: FormData): Promise<PostActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "无效的文章 ID" };

  try {
    await updatePost(id, readPostInput(formData));
    revalidatePath("/admin");
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function deletePostAction(formData: FormData): Promise<PostActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "无效的文章 ID" };

  try {
    await deletePost(id);
    revalidatePath("/admin");
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
