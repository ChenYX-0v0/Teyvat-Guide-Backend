"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Dialog,
  Form,
  Input,
  MessagePlugin,
  Select,
  Space,
  Table,
  Tag,
  Textarea,
} from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { AddIcon, BookOpenIcon, DeleteIcon, EditIcon } from "tdesign-icons-react";
import {
  createPostAction,
  deletePostAction,
  updatePostAction,
} from "./post-actions";

const { FormItem } = Form;

type PostRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  tags: string;
  status: "draft" | "published";
  updatedAt: string;
};

type EditorValues = Omit<PostRow, "id" | "updatedAt">;

const emptyPost: EditorValues = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  category: "技术随笔",
  tags: "",
  status: "draft",
};

function toFormData(values: EditorValues, id?: string) {
  const formData = new FormData();
  if (id) formData.set("id", id);
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

export function BlogDashboard({ posts }: { posts: PostRow[] }) {
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [formData, setFormData] = useState<EditorValues>(emptyPost);
  const [submitting, setSubmitting] = useState(false);
  const [deletingPost, setDeletingPost] = useState<PostRow | null>(null);

  const publishedCount = posts.filter((post) => post.status === "published").length;
  const draftCount = posts.length - publishedCount;

  const openCreate = () => {
    setEditingPost(null);
    setFormData(emptyPost);
    setEditorVisible(true);
  };

  const openEdit = (post: PostRow) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      content: post.content,
      category: post.category,
      tags: post.tags,
      status: post.status,
    });
    setEditorVisible(true);
  };

  const submitPost = async () => {
    if (!formData.title.trim() || !formData.slug.trim() || !formData.content.trim()) {
      MessagePlugin.warning("请填写标题、Slug 和正文");
      return;
    }

    setSubmitting(true);
    try {
      const result = editingPost
        ? await updatePostAction(toFormData(formData, editingPost.id))
        : await createPostAction(toFormData(formData));
      if (result.error) {
        MessagePlugin.error(result.error);
        return;
      }
      MessagePlugin.success(editingPost ? "文章已更新" : "文章已创建");
      setEditorVisible(false);
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingPost) return;
    const form = new FormData();
    form.set("id", deletingPost.id);
    const result = await deletePostAction(form);
    if (result.error) {
      MessagePlugin.error(result.error);
      return;
    }
    MessagePlugin.success("文章已删除");
    setDeletingPost(null);
    window.location.reload();
  };

  const columns = useMemo<PrimaryTableCol<PostRow>[]>(
    () => [
      {
        colKey: "title",
        title: "文章",
        minWidth: 260,
        cell: ({ row }) => (
          <div className="py-1">
            <p className="font-medium text-zinc-900">{row.title}</p>
            <p className="mt-1 font-mono text-xs text-zinc-400">/{row.slug}</p>
          </div>
        ),
      },
      { colKey: "category", title: "分类", width: 130 },
      {
        colKey: "status",
        title: "状态",
        width: 100,
        cell: ({ row }) => (
          <Tag theme={row.status === "published" ? "success" : "default"} variant="light">
            {row.status === "published" ? "已发布" : "草稿"}
          </Tag>
        ),
      },
      { colKey: "updatedAt", title: "最近更新", width: 180 },
      {
        colKey: "operation",
        title: "操作",
        width: 150,
        cell: ({ row }) => (
          <Space>
            <Button variant="text" icon={<EditIcon />} onClick={() => openEdit(row)}>
              编辑
            </Button>
            <Button
              variant="text"
              theme="danger"
              icon={<DeleteIcon />}
              onClick={() => setDeletingPost(row)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <BookOpenIcon size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900">CodeLog</h1>
              <p className="text-xs text-zinc-500">个人技术分享博客 · 创作后台</p>
            </div>
          </div>
          <Button theme="primary" icon={<AddIcon />} onClick={openCreate}>
            写新文章
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["全部文章", posts.length, "text-blue-600"],
            ["已发布", publishedCount, "text-emerald-600"],
            ["草稿箱", draftCount, "text-amber-600"],
          ].map(([label, value, color]) => (
            <Card key={String(label)} bordered>
              <p className="text-sm text-zinc-500">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
            </Card>
          ))}
        </section>

        <Card title="内容管理" bordered>
          <Table
            rowKey="id"
            data={posts}
            columns={columns}
            hover
            stripe
            tableLayout="auto"
            empty="还没有文章，点击“写新文章”开始创作"
          />
        </Card>
      </div>

      <Dialog
        header={editingPost ? "编辑文章" : "写新文章"}
        visible={editorVisible}
        width={760}
        confirmBtn={{ content: formData.status === "published" ? "保存并发布" : "保存草稿", loading: submitting }}
        onConfirm={submitPost}
        onClose={() => setEditorVisible(false)}
      >
        <Form labelAlign="top">
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormItem label="文章标题" requiredMark>
              <Input
                value={formData.title}
                maxlength={200}
                placeholder="例如：深入理解 React Server Components"
                onChange={(title) => setFormData((current) => ({ ...current, title }))}
              />
            </FormItem>
            <FormItem label="Slug" requiredMark>
              <Input
                value={formData.slug}
                placeholder="react-server-components"
                onChange={(slug) => setFormData((current) => ({ ...current, slug }))}
              />
            </FormItem>
            <FormItem label="分类">
              <Input
                value={formData.category}
                placeholder="前端开发"
                onChange={(category) => setFormData((current) => ({ ...current, category }))}
              />
            </FormItem>
            <FormItem label="标签">
              <Input
                value={formData.tags}
                placeholder="React, Next.js, TypeScript"
                onChange={(tags) => setFormData((current) => ({ ...current, tags }))}
              />
            </FormItem>
          </div>
          <FormItem label="文章摘要">
            <Textarea
              value={formData.summary}
              maxlength={500}
              autosize={{ minRows: 2, maxRows: 4 }}
              placeholder="简要介绍文章内容"
              onChange={(summary) => setFormData((current) => ({ ...current, summary }))}
            />
          </FormItem>
          <FormItem label="正文（支持 Markdown）" requiredMark>
            <Textarea
              value={formData.content}
              autosize={{ minRows: 10, maxRows: 18 }}
              placeholder="# 从这里开始写作..."
              onChange={(content) => setFormData((current) => ({ ...current, content }))}
            />
          </FormItem>
          <FormItem label="发布状态">
            <Select
              value={formData.status}
              options={[
                { label: "保存为草稿", value: "draft" },
                { label: "立即发布", value: "published" },
              ]}
              onChange={(status) =>
                setFormData((current) => ({ ...current, status: status as EditorValues["status"] }))
              }
            />
          </FormItem>
        </Form>
      </Dialog>

      <Dialog
        header="删除文章"
        visible={Boolean(deletingPost)}
        confirmBtn={{ content: "确认删除", theme: "danger" }}
        onConfirm={confirmDelete}
        onClose={() => setDeletingPost(null)}
      >
        确定删除文章“{deletingPost?.title}”吗？此操作不可撤销。
      </Dialog>
    </main>
  );
}
