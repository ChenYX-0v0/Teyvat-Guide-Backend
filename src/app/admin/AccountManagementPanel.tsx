"use client";

import { useState } from "react";
import { Button, Card, Dialog, Form, Input, MessagePlugin, Space, Table, Tag } from "tdesign-react";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { AddIcon, DeleteIcon, LockOnIcon } from "tdesign-icons-react";
import { changePasswordAction, createUserAction, deleteUserAction } from "./actions";

const { FormItem } = Form;

export type AccountRow = {
  id: string;
  username: string;
  phone: string | null;
  permissionLevel: number;
  createdAt: string;
};

type Props = {
  accounts: AccountRow[];
  level: 0 | 1 | 2;
  title: string;
  description: string;
  allowCreate?: boolean;
};

export function AccountManagementPanel({ accounts, level, title, description, allowCreate = true }: Props) {
  const accountType = title.replace("管理", "");
  const [createVisible, setCreateVisible] = useState(false);
  const [passwordAccount, setPasswordAccount] = useState<AccountRow | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<AccountRow | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = async (
    action: (formData: FormData) => Promise<{ error?: string }>,
    values: Record<string, unknown>,
    successMessage: string,
  ) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, String(value ?? "")));
    setLoading(true);
    try {
      const result = await action(formData);
      if (result.error) return MessagePlugin.error(result.error);
      MessagePlugin.success(successMessage);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const columns: PrimaryTableCol<AccountRow>[] = [
    { colKey: "id", title: "ID", width: 90 },
    { colKey: "username", title: "用户名", minWidth: 180 },
    ...(level === 0
      ? [{
          colKey: "phone",
          title: "手机号",
          minWidth: 150,
          cell: ({ row }: { row: AccountRow }) => row.phone || <span className="text-slate-400">未填写</span>,
        } satisfies PrimaryTableCol<AccountRow>]
      : []),
    {
      colKey: "role",
      title: "账号类型",
      width: 140,
      cell: () => <Tag variant="light">{title.replace("账号管理", "账号")}</Tag>,
    },
    { colKey: "createdAt", title: "创建时间", width: 200 },
    {
      colKey: "operation",
      title: "操作",
      width: 210,
      cell: ({ row }) => (
        <Space>
          <Button variant="text" icon={<LockOnIcon />} onClick={() => setPasswordAccount(row)}>
            重置密码
          </Button>
          <Button variant="text" theme="danger" icon={<DeleteIcon />} onClick={() => setDeleteAccount(row)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {allowCreate && (
          <Button theme="primary" icon={<AddIcon />} onClick={() => setCreateVisible(true)}>
            新建{accountType}
          </Button>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-900">账号列表</h3>
            <p className="mt-1 text-xs text-slate-400">查看并管理当前类型的全部账号</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            共 {accounts.length} 个
          </span>
        </div>
        <div className="admin-table-scroll overflow-x-auto">
          <Table
            className="admin-data-table w-full"
            rowKey="id"
            data={accounts}
            columns={columns}
            hover
            size="medium"
            verticalAlign="middle"
            tableLayout="auto"
            empty="暂无账号"
          />
        </div>
      </section>

      {allowCreate && (
        <Dialog
          header={`新建${accountType}`}
          visible={createVisible}
          confirmBtn={{ content: "创建账号", loading }}
          onClose={() => setCreateVisible(false)}
          onConfirm={() => document.getElementById("create-account-submit")?.click()}
        >
          <Form
            labelAlign="top"
            onSubmit={(context) => {
              if (context.validateResult !== true) return;
              void execute(createUserAction, { ...context.fields, permissionLevel: level }, `${accountType}创建成功`);
            }}
          >
            <FormItem label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}>
              <Input placeholder="请输入用户名" autocomplete="username" />
            </FormItem>
            <FormItem label="初始密码" name="password" rules={[{ required: true, message: "请输入初始密码" }]}>
              <Input type="password" placeholder="请输入初始密码" autocomplete="new-password" />
            </FormItem>
            {level === 0 && (
              <FormItem label="手机号" name="phone">
                <Input placeholder="请输入管理员手机号" autocomplete="tel" maxlength={20} />
              </FormItem>
            )}
            <button id="create-account-submit" type="submit" className="hidden" />
          </Form>
        </Dialog>
      )}

      <Dialog
        header={`重置 ${passwordAccount?.username ?? ""} 的密码`}
        visible={Boolean(passwordAccount)}
        confirmBtn={{ content: "确认重置", loading }}
        onClose={() => setPasswordAccount(null)}
        onConfirm={() => document.getElementById("password-account-submit")?.click()}
      >
        <Form
          labelAlign="top"
          onSubmit={(context) => {
            if (context.validateResult !== true || !passwordAccount) return;
            void execute(
              changePasswordAction,
              { username: passwordAccount.username, ...context.fields },
              "密码重置成功",
            );
          }}
        >
          <FormItem label="新密码" name="newPassword" rules={[{ required: true, message: "请输入新密码" }]}>
            <Input type="password" placeholder="请输入新密码" autocomplete="new-password" />
          </FormItem>
          <button id="password-account-submit" type="submit" className="hidden" />
        </Form>
      </Dialog>

      <Dialog
        header="删除账号"
        visible={Boolean(deleteAccount)}
        confirmBtn={{ content: "确认删除", theme: "danger", loading }}
        onClose={() => setDeleteAccount(null)}
        onConfirm={() =>
          deleteAccount &&
          void execute(deleteUserAction, { username: deleteAccount.username }, "账号已删除")
        }
      >
        确定删除账号“{deleteAccount?.username}”吗？此操作不可撤销。
      </Dialog>
    </div>
  );
}
