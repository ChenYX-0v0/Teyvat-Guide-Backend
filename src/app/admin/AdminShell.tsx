"use client";

import { useState } from "react";
import { Dialog, Menu, Tag } from "tdesign-react";
import {
  ChevronLeftIcon,
  EarthIcon,
  UserSafetyIcon,
} from "tdesign-icons-react";
import { AccountManagementPanel, type AccountRow } from "./AccountManagementPanel";
import { ProjectStatusPanel } from "./ProjectStatusPanel";
import { AssetMappingPanel } from "./teyvat-guide/AssetMappingPanel";
import { UserManagementPanel } from "./teyvat-guide/UserManagementPanel";
import type { AssetsData } from "./teyvat-guide/asset-actions";
import { logoutAction } from "./session-actions";

const { SubMenu, MenuItem } = Menu;

type MenuKey = "manager-accounts" | "tg-status" | "tg-assets" | "tg-users" | "ai-status";

type Props = {
  accounts: AccountRow[];
  currentUser: {
    username: string;
    phone: string | null;
    permissionLevel: number;
  };
  teyvatAssets: AssetsData;
};

const menuItems: Array<{ key: MenuKey; label: string; group: string }> = [
  { key: "manager-accounts", label: "管理员账号管理", group: "管理者设置" },
  { key: "tg-status", label: "服务状态", group: "AI 提瓦特向导" },
  { key: "tg-assets", label: "资产映射管理", group: "AI 提瓦特向导" },
  { key: "tg-users", label: "用户管理", group: "AI 提瓦特向导" },
  { key: "ai-status", label: "服务状态", group: "AI 派蒙服务" },
];

export function AdminShell({ accounts, currentUser, teyvatAssets }: Props) {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("manager-accounts");
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const managerAccounts = accounts.filter((account) => account.permissionLevel === 0);
  const currentMenu = menuItems.find((item) => item.key === activeMenu);
  const sidebarWidth = collapsed ? "lg:w-20" : "lg:w-72";
  const contentMargin = collapsed ? "lg:ml-20" : "lg:ml-72";

  return (
    <main className="min-h-screen bg-slate-50 lg:flex">
      <aside
        className={`border-b border-slate-200 bg-white text-slate-900 shadow-[4px_0_24px_rgba(15,23,42,0.04)] transition-all duration-200 lg:fixed lg:inset-y-0 lg:z-20 lg:flex lg:flex-col lg:border-b-0 lg:border-r ${sidebarWidth}`}
      >
        <div className={`flex h-20 items-center border-b border-slate-100 ${collapsed ? "justify-center px-3" : "justify-between px-5"}`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 font-mono text-base font-bold text-white shadow-lg shadow-blue-200">
              CL
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate font-bold tracking-tight text-slate-900">CodeLog</h1>
                  <Tag size="small" theme="primary" variant="light">Admin</Tag>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">网站综合管理系统</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              aria-label="收起侧边栏"
              onClick={() => setCollapsed(true)}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:flex"
            >
              <ChevronLeftIcon />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-5">
          {!collapsed && <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">工作空间</p>}
          <Menu
            theme="light"
            width="100%"
            collapsed={collapsed}
            expandType={collapsed ? "popup" : "normal"}
            value={activeMenu}
            defaultExpanded={["manager-settings", "project-settings", "teyvat-guide", "ai-paimon"]}
            onChange={(value) => setActiveMenu(value as MenuKey)}
          >
            <SubMenu value="manager-settings" title="管理者设置" icon={<UserSafetyIcon />}>
              <MenuItem value="manager-accounts" icon={<UserSafetyIcon />}>管理员账号管理</MenuItem>
            </SubMenu>
            <SubMenu value="project-settings" title="项目接入" icon={<EarthIcon />}>
              <SubMenu value="teyvat-guide" title="AI 提瓦特向导">
                <MenuItem value="tg-status">服务状态</MenuItem>
                <MenuItem value="tg-assets">资产映射管理</MenuItem>
                <MenuItem value="tg-users">用户管理</MenuItem>
              </SubMenu>
              <SubMenu value="ai-paimon" title="AI 派蒙服务">
                <MenuItem value="ai-status">服务状态</MenuItem>
              </SubMenu>
            </SubMenu>
          </Menu>
        </div>

        <div className="hidden border-t border-slate-100 p-4 lg:block">
          {collapsed ? (
            <button
              type="button"
              aria-label="展开侧边栏"
              onClick={() => setCollapsed(false)}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
            >
              <ChevronLeftIcon className="rotate-180" />
            </button>
          ) : (
            <div className="relative">
              {profileMenuVisible && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuVisible(false);
                      setProfileVisible(true);
                    }}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    个人信息
                  </button>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      退出
                    </button>
                  </form>
                </div>
              )}
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileMenuVisible}
                onClick={() => setProfileMenuVisible((visible) => !visible)}
                className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">{currentUser.username.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{currentUser.username}</p>
                  <p className="truncate text-xs text-slate-400">当前管理会话</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="在线" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <section className={`min-w-0 flex-1 transition-all duration-200 ${contentMargin}`}>
        <header className="sticky top-0 z-10 flex h-20 items-center border-b border-slate-200/80 bg-white/90 px-6 backdrop-blur lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>系统管理</span>
              <span>/</span>
              <span>{currentMenu?.group}</span>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{currentMenu?.label}</h2>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          {activeMenu === "manager-accounts" && (
            <AccountManagementPanel accounts={managerAccounts} level={0} title="管理员账号管理" description="管理拥有全站配置权限的管理人员账号" />
          )}
          {activeMenu === "tg-status" && (
            <ProjectStatusPanel
              projectCode="teyvat-guide"
              name="AI 提瓦特向导"
              subtitle="面向 C 端用户的 AI 提瓦特向导系统（teyvat-guide）"
              healthPath="/api/health"
              badge="提"
              showNotifications
            />
          )}
          {activeMenu === "tg-assets" && <AssetMappingPanel initialData={teyvatAssets} />}
          {activeMenu === "tg-users" && <UserManagementPanel />}
          {activeMenu === "ai-status" && (
            <ProjectStatusPanel
              projectCode="teyvat-ai"
              name="AI 派蒙服务"
              subtitle="独立部署的模型调用服务（teyvat-ai，:8090，不对外暴露）"
              healthPath="/health"
              badge="派"
            />
          )}
        </div>
      </section>

      <Dialog
        header="个人信息"
        visible={profileVisible}
        footer={false}
        onClose={() => setProfileVisible(false)}
      >
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-800 text-base font-semibold text-white">{currentUser.username.slice(0, 1).toUpperCase()}</div>
          <div>
            <p className="font-medium text-slate-900">{currentUser.username}</p>
            <p className="mt-1 text-sm text-slate-500">管理员 · {currentUser.phone || "未绑定手机号"}</p>
          </div>
        </div>
      </Dialog>
    </main>
  );
}
