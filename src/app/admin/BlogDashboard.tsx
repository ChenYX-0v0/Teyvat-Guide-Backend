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
  Tabs,
  Tag,
  Textarea,
} from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { AddIcon, DeleteIcon, EditIcon } from "tdesign-icons-react";
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

export type { PostRow };

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

export function BlogDashboard({ posts, embedded = false }: { posts: PostRow[]; embedded?: boolean }) {
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
      MessagePlugin.success(editingPost ? "官方内容已更新" : "官方内容已创建");
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
    MessagePlugin.success("官方内容已删除");
    setDeletingPost(null);
    window.location.reload();
  };

  const columns = useMemo<PrimaryTableCol<PostRow>[]>(
    () => [
      {
        colKey: "title",
        title: "官方内容",
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

  const content = (
    <>
      <div className="mb-6 border-b border-slate-200">
        <Tabs
          value="announcement"
          placement="top"
          list={[
            { value: "announcement", label: "公告管理" },
            { value: "course", label: "课程管理" },
            { value: "help", label: "帮助中心管理" },
          ]}
        />
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">官方发布管理</h2>
          <p className="mt-1 text-sm text-slate-500">创建、审核并发布网站官方内容</p>
        </div>
        <Button theme="primary" icon={<AddIcon />} onClick={openCreate}>
          新建官方发布
        </Button>
      </div>

      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["全部内容", posts.length, "text-blue-600"],
            ["已发布", publishedCount, "text-emerald-600"],
            ["草稿箱", draftCount, "text-amber-600"],
          ].map(([label, value, color]) => (
            <Card key={String(label)} bordered>
              <p className="text-sm text-zinc-500">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
            </Card>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-900">官方内容列表</h3>
              <p className="mt-1 text-xs text-slate-400">管理网站已创建的官方发布内容</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              共 {posts.length} 条
            </span>
          </div>
          <div className="admin-table-scroll overflow-x-auto">
            <Table
              className="admin-data-table min-w-[820px]"
              rowKey="id"
              data={posts}
              columns={columns}
              hover
              size="medium"
              verticalAlign="middle"
              tableLayout="auto"
              empty="暂无官方发布内容，点击“新建官方发布”开始创建"
            />
          </div>
        </section>
      </div>

      <Dialog
        header={editingPost ? "编辑官方内容" : "新建官方发布"}
        visible={editorVisible}
        width={760}
        confirmBtn={{ content: formData.status === "published" ? "保存并发布" : "保存草稿", loading: submitting }}
        onConfirm={submitPost}
        onClose={() => setEditorVisible(false)}
      >
        <Form labelAlign="top">
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormItem label="内容标题" requiredMark>
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
          <FormItem label="内容摘要">
            <Textarea
              value={formData.summary}
              maxlength={500}
              autosize={{ minRows: 2, maxRows: 4 }}
              placeholder="简要介绍官方内容"
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
        header="删除官方内容"
        visible={Boolean(deletingPost)}
        confirmBtn={{ content: "确认删除", theme: "danger" }}
        onConfirm={confirmDelete}
        onClose={() => setDeletingPost(null)}
      >
        确定删除官方内容“{deletingPost?.title}”吗？此操作不可撤销。
      </Dialog>
    </>
  );

  if (embedded) return content;
  return <main className="min-h-screen bg-zinc-50 px-6 py-8">{content}</main>;
}
