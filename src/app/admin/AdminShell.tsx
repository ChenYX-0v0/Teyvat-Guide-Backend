"use client";

import { useState } from "react";
import { Menu, Tag } from "tdesign-react";
import {
  ArticleIcon,
  ChevronLeftIcon,
  UserListIcon,
  UserSafetyIcon,
  UserSettingIcon,
  ViewModuleIcon,
} from "tdesign-icons-react";
import { BlogDashboard, type PostRow } from "./BlogDashboard";
import { AccountManagementPanel, type AccountRow } from "./AccountManagementPanel";

const { SubMenu, MenuItem } = Menu;

type MenuKey = "visitor-accounts" | "creator-posts" | "creator-accounts" | "manager-accounts";

type Props = {
  posts: PostRow[];
  accounts: AccountRow[];
};

const menuItems: Array<{ key: MenuKey; label: string; group: string }> = [
  { key: "visitor-accounts", label: "游客账号管理", group: "游客界面设置" },
  { key: "creator-posts", label: "官方发布管理", group: "创作者后台设置" },
  { key: "creator-accounts", label: "创作者账号管理", group: "创作者后台设置" },
  { key: "manager-accounts", label: "管理员账号管理", group: "管理者设置" },
];

export function AdminShell({ posts, accounts }: Props) {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("creator-posts");
  const [collapsed, setCollapsed] = useState(false);
  const visitorAccounts = accounts.filter((account) => account.permissionLevel === 2);
  const creatorAccounts = accounts.filter((account) => account.permissionLevel === 1);
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

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {!collapsed && <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">工作空间</p>}
          <Menu
            theme="light"
            width="100%"
            collapsed={collapsed}
            expandType={collapsed ? "popup" : "normal"}
            value={activeMenu}
            defaultExpanded={["visitor-settings", "creator-settings", "manager-settings"]}
            onChange={(value) => setActiveMenu(value as MenuKey)}
          >
            <SubMenu value="visitor-settings" title="游客界面设置" icon={<ViewModuleIcon />}>
              <MenuItem value="visitor-accounts" icon={<UserListIcon />}>游客账号管理</MenuItem>
            </SubMenu>
            <SubMenu value="creator-settings" title="创作者后台设置" icon={<ArticleIcon />}>
              <MenuItem value="creator-posts" icon={<ArticleIcon />}>官方发布管理</MenuItem>
              <MenuItem value="creator-accounts" icon={<UserSettingIcon />}>创作者账号管理</MenuItem>
            </SubMenu>
            <SubMenu value="manager-settings" title="管理者设置" icon={<UserSafetyIcon />}>
              <MenuItem value="manager-accounts" icon={<UserSafetyIcon />}>管理员账号管理</MenuItem>
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
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">A</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">系统管理员</p>
                <p className="truncate text-xs text-slate-400">当前管理会话</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500" title="在线" />
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
          {activeMenu === "creator-posts" && <BlogDashboard posts={posts} embedded />}
          {activeMenu === "visitor-accounts" && (
            <AccountManagementPanel accounts={visitorAccounts} level={2} title="游客账号管理" description="管理可登录游客界面的账号及访问身份" allowCreate={false} />
          )}
          {activeMenu === "creator-accounts" && (
            <AccountManagementPanel accounts={creatorAccounts} level={1} title="创作者账号管理" description="管理文章创作者账号及后台访问身份" allowCreate={false} />
          )}
          {activeMenu === "manager-accounts" && (
            <AccountManagementPanel accounts={managerAccounts} level={0} title="管理员账号管理" description="管理拥有全站配置权限的管理人员账号" />
          )}
        </div>
      </section>
    </main>
  );
}
