# CodeLog 博客后台

基于 Next.js 16、React 19、TDesign、TypeORM 和 MySQL 的个人技术分享博客内容管理后台。

## 功能

- 管理员账号密码登录（bcrypt 密码校验）
- 文章数量、发布数量和草稿数量统计
- 技术文章创建、编辑和删除
- 草稿与发布状态管理
- Markdown 正文、摘要、分类、标签和自定义 Slug
- 原有账号管理服务与 Server Actions 保留在 `src/lib/auth.ts` 和 `src/app/admin/actions.ts`

## 本地运行

1. 安装 Node.js 20.9 或更高版本和 MySQL。
2. 安装依赖：

   ```bash
   npm install
   ```

3. 执行 `database.sql` 初始化数据库表。
4. 在项目根目录创建 `.env.local`：

   ```dotenv
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=root
   DB_NAME=demo_project
   ```

5. 在 `users` 表中准备一个 bcrypt 哈希密码的管理员账号。
6. 启动开发服务器：

   ```bash
   npm run dev
   ```

7. 打开 `http://localhost:3000`。

## 系统架构

项目采用 Next.js App Router 的全栈分层架构：

```text
浏览器
  │
  ├─ 登录页 /                       Server Component + Client Form
  └─ 创作后台 /admin               Server Component + Client Dashboard
              │
              ▼
      Next.js Server Actions
      ├─ app/actions.ts             登录请求
      ├─ app/admin/post-actions.ts  文章增删改
      └─ app/admin/actions.ts       用户管理（保留）
              │
              ▼
          业务服务层
      ├─ lib/auth.ts                用户认证与账号管理
      └─ lib/blog.ts                文章校验与 CRUD
              │
              ▼
       TypeORM Repository
      ├─ entities/User.ts
      └─ entities/Post.ts
              │
              ▼
             MySQL
      ├─ users                      用户与权限
      └─ posts                      博客文章
```

### 分层职责

| 层级 | 目录 | 职责 |
| --- | --- | --- |
| 路由与页面层 | `src/app` | 页面路由、服务端数据加载和页面组合 |
| 客户端交互层 | `src/components`、`src/app/admin/BlogDashboard.tsx` | 表单、表格、弹窗、状态和用户反馈 |
| 服务端入口层 | `src/app/actions.ts`、`src/app/admin/*-actions.ts` | 接收表单、调用业务服务并刷新页面数据 |
| 业务服务层 | `src/lib` | 登录验证、输入校验、文章和用户 CRUD |
| 数据模型层 | `src/entities` | TypeORM 实体与数据库字段映射 |
| 数据存储层 | MySQL | 持久化用户、权限和博客文章 |

### 主要数据流

**登录流程：** 登录表单 → `loginAction()` → `verifyUser()` → 查询 `users` → bcrypt 校验 → 跳转 `/admin`。

**文章管理流程：** 后台表单 → 文章 Server Action → `lib/blog.ts` 校验及处理 → TypeORM 操作 `posts` → `revalidatePath("/admin")` → 刷新列表。

### 渲染策略

- `/` 为静态登录页面，交互部分由客户端组件处理。
- `/admin` 使用动态服务端渲染，每次请求从 MySQL 加载最新文章。
- 数据写入通过 Server Actions 完成，浏览器不直接连接数据库。
- 全局 UI 使用 TDesign，布局与视觉样式使用 Tailwind CSS。

## 主要目录

```text
src/
├─ app/
│  ├─ actions.ts                    # 登录 Server Action
│  ├─ page.tsx                      # 博客后台登录页
│  └─ admin/
│     ├─ page.tsx                   # 动态加载文章的管理入口
│     ├─ BlogDashboard.tsx          # 文章管理客户端界面
│     ├─ post-actions.ts            # 文章 Server Actions
│     ├─ AdminPageContent.tsx       # 保留的账号管理界面
│     └─ actions.ts                 # 保留的账号管理 Actions
├─ components/                      # 登录表单、UI 和国际化 Provider
├─ entities/
│  ├─ Post.ts                       # 文章实体
│  └─ User.ts                       # 用户实体
└─ lib/
   ├─ auth.ts                       # 认证与账号服务
   ├─ blog.ts                       # 文章业务服务
   ├─ db.ts                         # TypeORM/MySQL 连接
   └─ i18n.ts                       # 中文界面文案

database.sql                        # MySQL 初始化结构
```

## 注意

TypeORM 的 `synchronize` 已关闭，修改实体后需要同步维护数据库迁移或 `database.sql`。当前登录仅校验账号密码，尚未建立 Session/Cookie；用于生产环境前应补充会话、路由保护以及 Server Action 权限校验。
