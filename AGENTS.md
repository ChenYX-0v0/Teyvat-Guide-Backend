<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — AI 协作开发规范

> 本文件面向 AI 编码代理与人类协作者，描述本项目的架构、约定与"必须/禁止"事项。
> 修改任何代码前请先阅读本文；与本文冲突的旧代码不代表规范本身，遇到不一致请遵循本文。

## 0. 文档入口（共享文档仓）

项目文档与跨项目契约**不在本仓**，而在三项目共享文档仓 `teyvat-docs`（远程 `git@github.com:ChenYX-0v0/Teyvat-Guide-Docs.git`），通过 **Junction 目录链接**挂载。三个项目访问到的文档是**同一份文件**（哈希一致），改一处三处同步。

### 0.1 布局与挂载关系

| 项目 | 项目内路径 | 实际位置 | 内容 |
| --- | --- | --- | --- |
| 后台（本仓） | `docs/` | `teyvat-docs\admin` | 本项目文档（平台总体设计 / 后台接入设计 / 运维接入 / 网关设计 / TODO） |
| 后台（本仓） | `aidoc/` | `teyvat-docs\ai` | AI 派蒙服务文档（只读参考，勿在此改动 AI 侧文档） |
| 后台（本仓） | `shared-docs/` | `teyvat-docs\shared` | **跨项目契约**（接口契约 / 主服务对接说明 / 用户体系与鉴权边界设计） |
| 主服务 teyvat-guide | `docs/`、`shared-docs/` | `teyvat-docs\web`、`\shared` | 主服务文档、共用契约 |
| AI 派蒙服务 | `doc/` | `teyvat-docs\ai` | AI 服务文档（同源） |

编号只在各自目录内唯一（`admin/01` 与 `web/01` 互不冲突），**交叉引用必须写明路径**（如 `shared-docs/01-接口契约.md`）。

### 0.2 读 / 改 / 提交（标准操作）

```powershell
# 读：任一项目的链接路径都能打开，内容同源，无需特殊操作
# 改：建议在共享仓内编辑（从项目 docs/ 路径编辑也完全等效——同一份文件）

cd C:\Users\HONOR\Desktop\teyvat-docs
git add -A
git commit -m "docs: 说明本次改动"
git push
```

- 提交**只在 `teyvat-docs` 发生**，三个项目仓不产生文档改动。

### 0.3 规矩（必须遵守）

1. 文档**只在共享仓 `C:\Users\HONOR\Desktop\teyvat-docs` 修改并提交**；项目内的 `docs/`、`aidoc/`、`shared-docs/` 是链接，禁止在本仓提交文档内容（已在 `.gitignore` 忽略）。
2. 禁止在项目内另建文档副本（历史副本 `docs/teyvatGuide/`、`aidoc/doc/` 已清理，勿再引入）。
3. 改 `aidoc/`（AI 侧）或 `shared-docs/`（契约）会影响其他项目，提交信息需说明影响面。
4. Junction 不进 git：新机器 / 新克隆后运行 `teyvat-docs\setup-docs.ps1` 重建链接（7 个链接）。
5. **本仓 `git status` 必须看不到任何文档目录项**——出现即为 `.gitignore` 忽略规则被破坏（见第 7 条），这是最快的一致性自检信号。
6. 禁止在本仓执行 `git clean -fd`，禁止直接删除 `docs/`、`aidoc/`、`shared-docs/` 目录——Junction 删除会**连带清空真源内容**，等于删掉共享文档。
7. 禁止删除 `.gitignore` 中的 `/docs/`、`/aidoc/`、`/shared-docs/` 忽略规则，否则 git 会顺着链接把共享文档当项目文件收录。
8. `setup-docs.ps1` 必须存为 **UTF-8 with BOM**（PowerShell 5.1 否则按 GBK 读，中文路径报 `Unexpected token`）；**`.yaml` 反之绝对不能带 BOM**。

## 1. 项目概览

CodeLog 管理系统 — 多项目统一管理后台（单体 Next.js 应用）：

| 模块 | 路径 | 技术栈 |
| --- | --- | --- |
| 页面与 API | `src/app/` | Next.js 16 App Router + React 19 + TypeScript |
| UI 组件 | TDesign React + Tailwind CSS 4 | 表格/表单/弹窗等一律用 TDesign |
| 数据层 | `src/entities/` + `src/lib/db.ts` | TypeORM + MySQL（`synchronize: false`，禁止运行时自动改表） |
| 服务端逻辑 | `src/lib/` | bcryptjs 密码哈希、Session/Cookie 鉴权、Server Actions |

- 定位：管理多个业务项目（如「AI 提瓦特向导」），设计见 `docs/01-多项目管理平台总体设计.md`。
- 文档在 `docs/`，`docs/README.md` 为入口。
- 业务项目（如 teyvatGuide）是**异构独立系统**，只能通过 HTTP 网关集成，禁止共库直连。

## 2. 常用命令

```powershell
npm run dev        # 开发服务器
npm run build      # next build（含 TypeScript 检查），提交前必须通过
npm run start      # 生产启动
```

- 本项目无独立 lint 脚本，提交前以 `npm run build` 通过为底线。
- 数据库表结构变更：更新 `database.sql` + 手写幂等迁移脚本执行（执行完删除临时脚本）。

## 3. 目录结构与分层

```
src/
├─ app/                     # App Router
│  ├─ page.tsx              # 登录页
│  ├─ admin/                # 管理后台（AdminShell 为外壳，页面按功能分文件）
│  │  ├─ actions.ts         # Server Actions（账号增删改密）
│  │  └─ session-actions.ts # Session 相关（退出等）
│  ├─ api/                  # Route Handlers（如 auth/sms/*）
│  └─ globals.css           # Tailwind 4 + TDesign 定制样式
├─ components/              # 通用组件（LoginForm、I18nProvider 等）
├─ entities/                # TypeORM 实体，一表一文件，经 index.ts 统一导出
└─ lib/                     # 服务端基础设施（db / session / auth / sms / 网关等）
```

**分层约定**：

- 页面组件不直接写 SQL，数据访问一律走 `lib/` 封装或 TypeORM Repository。
- 服务端专用代码必须 `import "server-only"`（参照 `lib/session.ts`）。
- 密钥、连接信息只从 `process.env` 读，提供默认值方便本地启动。
- 客户端组件顶部必须 `"use client"`；服务端逻辑不进客户端 bundle。

## 4. 后端规范（Next.js Server）

### 4.1 鉴权与 Session

- 鉴权统一走 `lib/session.ts`：`requireAdmin()` 守卫管理页，Session 存 `user_sessions` 表，Cookie `admin_session`（httpOnly）。
- 密码一律 bcryptjs 哈希存储，禁止明文。
- 新增需要鉴权的页面：服务端组件内先 `await requireAdmin()`。

### 4.2 Server Actions 与 Route Handlers

- 用户管理类操作走 Server Actions（`src/app/admin/actions.ts`），返回 `{ error?: string }` 风格结果。
- 对外 HTTP 接口走 Route Handlers（`src/app/api/xxx/route.ts`），响应用现有 `{ success, message, ... }` 风格。
- 新增数据表必须：`src/entities/Xxx.ts` 实体 → `entities/index.ts` 导出 → `lib/db.ts` 注册 entities 数组 → `database.sql` 同步 → 幂等迁移执行。

### 4.3 统一响应与错误

- Server Actions / Route Handlers 返回可读的中文错误信息，不向客户端暴露内部细节（SQL、堆栈）。
- 服务端日志用 `console.log` 带统一前缀，格式参照现有：`[db] 消息 | key=value | 时间=ISO`。

### 4.4 数据库

- TypeORM `synchronize: false`，**禁止改代码自动改表**；表结构变更走幂等迁移（`CREATE TABLE IF NOT EXISTS` / 先查 information_schema 再 ALTER）。
- 所有业务数据一律存数据库，**禁止在代码中硬编码记录数据**（映射表、配置常量、枚举文案等）；代码只定义结构与逻辑。
- 项目接入凭证（如业务项目的 Admin Key）只存服务端 env 或注册表 `auth_config`，禁止下发到浏览器。

### 4.5 多项目网关（规划中，见 docs/01）

- 业务项目集成只走 `/api/gateway/[project]/*` 服务端代理：校验本系统 Session → 查注册表注入凭证 → 转发 → 响应归一化。
- 浏览器禁止直连业务项目地址；业务项目地址只配在服务端（env / 注册表），禁止硬编码在前端。

## 5. 前端规范（React + TS）

### 5.1 命名

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 组件文件 | PascalCase | `LoginForm.tsx` |
| hooks | use 前缀 | `useI18n` |
| 类型 | PascalCase | `SmsResponse` |
| Route Handler | route.ts | `api/auth/sms/send/route.ts` |

### 5.2 组件与状态

- UI 组件统一用 **TDesign React**（Form / Input / Select / Table / Dialog / MessagePlugin 等），禁止混用原生控件拼 UI（样式定制通过 TDesign 官方 props 或受控包装实现）。
- UI 组件库样式定制统一写在 `app/globals.css`，用语义化类名（参照 `.admin-data-table`）。
- 数据流：页面（Server 组件取数）→ 客户端组件 → Server Actions / `fetch("/api/...")`。
- 局部 UI 状态用 `useState`；请求回调用 `useCallback` 并写全依赖。
- 禁止 `any`，需要时用 `unknown` + 收窄；`tsconfig` strict 保持全开。

### 5.3 样式

- Tailwind 4 原子类优先；主题色等通过 `globals.css` 的 `@theme` 定义。
- 条件类名用模板字符串，保持与现有代码一致的风格。
- 路径别名：`@/*` → `src/*`，import 一律用 `@/`。

### 5.4 文案与国际化

- 用户可见文案优先走 `useI18n()`（`components/I18nProvider`），新增 key 同步中英文案；管理后台内部提示允许直接简体中文。

## 6. 通用代码风格

- 注释与 UI 文案使用简体中文；标识符、错误信息、日志 key 使用英文。
- 组件用函数式 + hooks，不写 class。
- Git：不提交 `.env`、密钥、`node_modules/`、`.next/`（见 `.gitignore`）。

## 7. 禁止事项（AI 高频踩坑清单）

1. ❌ 把 TypeORM `synchronize` 打开来自动建表——必须走幂等迁移 + `database.sql` 同步。
2. ❌ 在代码里硬编码业务数据（账号、映射、密钥、后端地址）——数据入库、地址进配置。
3. ❌ 把密钥 / Admin Key 下发到浏览器或写进客户端组件。
4. ❌ 浏览器直连业务项目（teyvatGuide 等）——一律走服务端网关代理。
5. ❌ 绕过 `lib/session.ts` 自造鉴权；新管理页漏加 `requireAdmin()`。
6. ❌ 用原生 `<input>`/`<select>` 拼带样式的表单控件——用 TDesign，宽度等用官方 props（如 `autoWidth`）解决。
7. ❌ 修改 `tsconfig` 的 `strict`、关闭检查来"修复"报错——应修代码本身。
8. ❌ 未经确认执行 `git commit` / `git push` / 删除文件等破坏性操作。
9. ❌ 触碰 `.codebuddy/` 目录；它不是临时缓存。
10. ❌ 提交含真实密钥的文件；密钥只通过环境变量注入。
11. ❌ 忽略 AGENTS.md 顶部的 Next.js 版本警告——API 与训练数据可能不一致，写代码前先查 `node_modules/next/dist/docs/`。
12. ❌ 删除 `AGENTS.md` 中的 `nextjs-agent-rules` 块。

## 8. 变更后的自检清单

- [ ] `npm run build` 通过
- [ ] 新实体已注册 `entities/index.ts` + `lib/db.ts`，`database.sql` 已同步，幂等迁移已执行
- [ ] 新接口/页面已接入鉴权（`requireAdmin()` 或等价守卫）
- [ ] 新配置项已加入 `.env.example`（如存在）
- [ ] 架构/流程变更已同步 `docs/` 与本文件
- [ ] 文档改动只在 `teyvat-docs` 提交，本仓 `git status` 无 `docs/` / `aidoc/` / `shared-docs/` 项
