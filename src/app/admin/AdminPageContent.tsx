"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Card,
  Table,
  Button,
  Form,
  Input,
  Select,
  Tag,
  MessagePlugin,
  Dialog,
  Tabs,
} from "tdesign-react";
import type { TabValue } from "tdesign-react";
import { SettingIcon } from "tdesign-icons-react";
import type { FormInstanceFunctions } from "tdesign-react/es/form/type";
import type { PrimaryTableCol } from "tdesign-react/es/table/type";
import { useI18n } from "@/components/I18nProvider";
import {
  createUserAction,
  changePasswordAction,
  setPermissionAction,
  deleteUserAction,
} from "./actions";

const { FormItem } = Form;
const { TabPanel } = Tabs;

type UserRow = {
  id: string;
  username: string;
  permissionLevel: number;
  createdAt: string;
};

function objectToFormData(obj: Record<string, any>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      fd.set(key, String(value));
    }
  }
  return fd;
}

async function execute(
  action: (formData: FormData) => Promise<{ error?: string }>,
  formData: FormData,
  successMsg: string,
) {
  const result = await action(formData);
  if (result.error) {
    MessagePlugin.error(result.error);
  } else {
    MessagePlugin.success(successMsg);
    window.location.reload();
  }
}

const permissionOptions = [
  { value: 0 },
  { value: 1 },
];

export function AdminPageContent({ users }: { users: UserRow[] }) {
  const t = useI18n();
  const formRef = useRef<FormInstanceFunctions>(null);
  const [activeTab, setActiveTab] = useState<TabValue>("create");
  const [updating, setUpdating] = useState(false);
  const [deleteUsername, setDeleteUsername] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FormData | null>(null);

  const adminCount = users.filter((u) => u.permissionLevel === 0).length;
  const permissionText = (level: number) =>
    level === 0 ? t("admin.superAdmin") : t("admin.normalUser");

  const columns = useMemo<PrimaryTableCol<UserRow>[]>(
    () => [
      { colKey: "id", title: t("admin.id"), width: 80 },
      { colKey: "username", title: t("admin.username"), width: 180 },
      {
        colKey: "permissionLevel",
        title: t("admin.permissionLevel"),
        width: 140,
        cell: ({ row }) =>
          row.permissionLevel === 0 ? (
            <Tag theme="warning" variant="light">{permissionText(row.permissionLevel)}</Tag>
          ) : (
            <Tag theme="default" variant="light">{permissionText(row.permissionLevel)}</Tag>
          ),
      },
      { colKey: "createdAt", title: t("admin.createdAt"), ellipsis: true },
    ],
    [t],
  );

  const translatedPermissionOptions = permissionOptions.map((option) => ({
    ...option,
    label: option.value === 0 ? `${t("admin.superAdmin")} (0)` : `${t("admin.normalUser")} (1)`,
  }));

  const handleSubmit = useCallback(async (ctx: any) => {
    if (ctx.validateResult !== true) return;
    setUpdating(true);
    const fd = objectToFormData(ctx.fields!);

    try {
      if (activeTab === "delete") {
        setDeleteUsername(String(fd.get("username") ?? ""));
        setPendingDelete(fd);
        setConfirmVisible(true);
      } else if (activeTab === "create") {
        await execute(createUserAction, fd, t("admin.createSuccess"));
        formRef.current?.reset();
      } else if (activeTab === "password") {
        await execute(changePasswordAction, fd, t("admin.passwordSuccess"));
        formRef.current?.reset();
      } else if (activeTab === "permission") {
        await execute(setPermissionAction, fd, t("admin.permissionSuccess"));
        formRef.current?.reset();
      }
    } finally {
      setUpdating(false);
    }
  }, [activeTab, t]);

  const confirmDelete = useCallback(async () => {
    setConfirmVisible(false);
    if (!pendingDelete) return;
    await execute(deleteUserAction, pendingDelete, t("admin.deleteSuccess", { username: deleteUsername }));
    formRef.current?.reset();
    setPendingDelete(null);
  }, [deleteUsername, pendingDelete, t]);

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <SettingIcon size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">{t("admin.title")}</h1>
              <p className="text-xs text-zinc-500">{t("admin.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{users.length}</p>
              <p className="text-xs text-zinc-500">{t("admin.totalUsers")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{adminCount}</p>
              <p className="text-xs text-zinc-500">{t("admin.admins")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <Card title={t("admin.userList")} bordered>
          <Table
            data={users}
            columns={columns}
            rowKey="id"
            bordered
            stripe
            hover
            size="medium"
            empty={t("admin.noUsers")}
          />
        </Card>

        <Card bordered>
          <Tabs
            value={activeTab}
            onChange={(val) => setActiveTab(val)}
            theme="card"
            size="medium"
          >
            <TabPanel value="create" label={t("admin.createUser")}>
              <div className="pt-4">
                <Form ref={formRef} key="create" onSubmit={handleSubmit} labelWidth={100} resetType="initial">
                  <FormItem label={t("admin.username")} name="username" rules={[{ required: true, message: t("admin.inputUsername") }]}>
                    <Input placeholder={t("admin.inputUsername")} clearable />
                  </FormItem>
                  <FormItem label={t("admin.password")} name="password" rules={[{ required: true, message: t("admin.inputPassword") }]}>
                    <Input type="password" placeholder={t("admin.inputPassword")} />
                  </FormItem>
                  <FormItem label={t("admin.permissionLevel")} name="permissionLevel" initialData={1}>
                    <Select options={translatedPermissionOptions} />
                  </FormItem>
                  <FormItem>
                    <Button theme="primary" type="submit" loading={updating}>{t("admin.createUser")}</Button>
                    <Button theme="default" variant="outline" className="ml-3" onClick={() => formRef.current?.reset()}>{t("admin.reset")}</Button>
                  </FormItem>
                </Form>
              </div>
            </TabPanel>

            <TabPanel value="password" label={t("admin.changePassword")}>
              <div className="pt-4">
                <Form ref={formRef} key="password" onSubmit={handleSubmit} labelWidth={100} resetType="initial">
                  <FormItem label={t("admin.username")} name="username" rules={[{ required: true, message: t("admin.inputUsername") }]}>
                    <Input placeholder={t("admin.inputUsername")} clearable />
                  </FormItem>
                  <FormItem label={t("admin.newPassword")} name="newPassword" rules={[{ required: true, message: t("admin.inputNewPassword") }]}>
                    <Input type="password" placeholder={t("admin.inputNewPassword")} />
                  </FormItem>
                  <FormItem>
                    <Button theme="primary" type="submit" loading={updating}>{t("admin.changePassword")}</Button>
                  </FormItem>
                </Form>
              </div>
            </TabPanel>

            <TabPanel value="permission" label={t("admin.setPermission")}>
              <div className="pt-4">
                <Form ref={formRef} key="permission" onSubmit={handleSubmit} labelWidth={100} resetType="initial">
                  <FormItem label={t("admin.username")} name="username" rules={[{ required: true, message: t("admin.inputUsername") }]}>
                    <Input placeholder={t("admin.inputUsername")} clearable />
                  </FormItem>
                  <FormItem label={t("admin.permissionLevel")} name="level" initialData={1}>
                    <Select options={translatedPermissionOptions} />
                  </FormItem>
                  <FormItem>
                    <Button theme="primary" type="submit" loading={updating}>{t("admin.setPermission")}</Button>
                  </FormItem>
                </Form>
              </div>
            </TabPanel>

            <TabPanel value="delete" label={t("admin.deleteUser")}>
              <div className="pt-4">
                <Form ref={formRef} key="delete" onSubmit={handleSubmit} labelWidth={100} resetType="initial">
                  <FormItem label={t("admin.username")} name="username" rules={[{ required: true, message: t("admin.inputUsername") }]}>
                    <Input placeholder={t("admin.inputDeleteUsername")} clearable />
                  </FormItem>
                  <FormItem>
                    <Button theme="danger" type="submit" loading={updating}>{t("admin.deleteUser")}</Button>
                  </FormItem>
                </Form>
              </div>
            </TabPanel>
          </Tabs>
        </Card>
      </div>

      <Dialog
        header={t("admin.confirmDelete")}
        visible={confirmVisible}
        onClose={() => { setConfirmVisible(false); setPendingDelete(null); }}
        onConfirm={confirmDelete}
        confirmBtn={{ content: t("admin.confirmDelete"), theme: "danger" }}
        cancelBtn={t("admin.cancel")}
      >
        <p>{t("admin.deleteConfirmText", { username: deleteUsername })}</p>
      </Dialog>
    </main>
  );
}
