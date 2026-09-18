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
   DB_NAME=teyvat_admin
   ```

5. 在 `users` 表中准备一个 bcrypt 哈希密码的管理员账号。
6. 启动开发服务器：

   ```bash
   npm run dev
   ```

7. 打开 `http://localhost:3000`。

## 主要目录

- `src/app/page.tsx`：博客后台登录页
- `src/app/admin/page.tsx`：官方发布管理入口
- `src/app/admin/BlogDashboard.tsx`：官方发布管理界面
- `src/app/admin/post-actions.ts`：官方内容 Server Actions
- `src/lib/blog.ts`：文章业务与数据访问
- `src/entities/Post.ts`：文章实体
- `database.sql`：MySQL 表结构

## 注意

TypeORM 的 `synchronize` 已关闭，修改实体后需要同步维护数据库迁移或 `database.sql`。当前登录仅校验账号密码，尚未建立 Session/Cookie；用于生产环境前应补充会话、路由保护以及 Server Action 权限校验。
