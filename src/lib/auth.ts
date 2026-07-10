import bcrypt from "bcryptjs";
import { User } from "@/entities";
import { getDataSource } from "@/lib/db";
import { translate as t } from "@/lib/i18n";

async function getUserRepo() {
  const ds = await getDataSource();
  return ds.getRepository(User);
}

/** 验证用户登录 */
export async function verifyUser(username: string, password: string) {
  console.log(`[auth] verifyUser 开始 | username="${username}"`);

  const repo = await getUserRepo();

  const user = await repo
    .createQueryBuilder("u")
    .addSelect("u.password")
    .where("u.username = :username", { username })
    .getOne();

  if (!user) {
    console.warn(`[auth] verifyUser 用户不存在 | username="${username}"`);
    return null;
  }

  console.log(`[auth] verifyUser 找到用户 | id=${user.id} permissionLevel=${user.permissionLevel}`);

  const matched = await bcrypt.compare(password, user.password);

  if (!matched) {
    console.warn(`[auth] verifyUser 密码不匹配 | username="${username}"`);
    return null;
  }

  console.log(`[auth] verifyUser ✅ 验证通过 | username="${username}"`);
  return {
    id: user.id,
    username: user.username,
    permissionLevel: user.permissionLevel,
  };
}

/** 创建用户 */
export async function createUser(
  username: string,
  password: string,
  permissionLevel: number = 1,
) {
  console.log(
    `[auth] createUser 开始 | username="${username}" permissionLevel=${permissionLevel}`,
  );

  const repo = await getUserRepo();

  const existing = await repo.findOne({ where: { username } });
  if (existing) {
    console.warn(`[auth] createUser 用户名已存在 | username="${username}"`);
    throw new Error(t("admin.usernameExists"));
  }

  const hashed = await bcrypt.hash(password, 10);
  console.log(`[auth] createUser 密码已哈希 | 长度=${hashed.length}`);

  const user = repo.create({ username, password: hashed, permissionLevel });
  await repo.save(user);

  console.log(
    `[auth] createUser ✅ 创建成功 | id=${user.id} username="${username}" permissionLevel=${user.permissionLevel}`,
  );

  return {
    id: user.id,
    username: user.username,
    permissionLevel: user.permissionLevel,
    createdAt: user.createdAt,
  };
}

/** 修改密码 */
export async function changePassword(username: string, newPassword: string) {
  console.log(`[auth] changePassword 开始 | username="${username}"`);

  const repo = await getUserRepo();

  const user = await repo.findOne({ where: { username } });
  if (!user) {
    console.warn(`[auth] changePassword 用户不存在 | username="${username}"`);
    throw new Error(t("admin.userNotFound"));
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await repo.save(user);

  console.log(`[auth] changePassword ✅ 修改成功 | username="${username}"`);
}

/** 设置权限等级 */
export async function setPermissionLevel(username: string, level: number) {
  console.log(
    `[auth] setPermissionLevel 开始 | username="${username}" newLevel=${level}`,
  );

  const repo = await getUserRepo();

  const user = await repo.findOne({ where: { username } });
  if (!user) {
    console.warn(`[auth] setPermissionLevel 用户不存在 | username="${username}"`);
    throw new Error(t("admin.userNotFound"));
  }

  const oldLevel = user.permissionLevel;
  user.permissionLevel = level;
  await repo.save(user);

  console.log(
    `[auth] setPermissionLevel ✅ 权限变更 | username="${username}" ${oldLevel}→${level}`,
  );

  return {
    id: user.id,
    username: user.username,
    permissionLevel: user.permissionLevel,
  };
}

/** 删除用户 */
export async function deleteUser(username: string) {
  console.log(`[auth] deleteUser 开始 | username="${username}"`);

  const repo = await getUserRepo();

  const user = await repo.findOne({ where: { username } });
  if (!user) {
    console.warn(`[auth] deleteUser 用户不存在 | username="${username}"`);
    throw new Error(t("admin.userNotFound"));
  }

  await repo.remove(user);

  console.log(`[auth] deleteUser ✅ 已删除 | username="${username}"`);
}

/** 获取用户列表 */
export async function listUsers() {
  console.log("[auth] listUsers 查询用户列表");
  const repo = await getUserRepo();

  const users = await repo.find({
    select: { id: true, username: true, permissionLevel: true, createdAt: true },
    order: { id: "ASC" },
  });

  console.log(`[auth] listUsers 返回 ${users.length} 条记录`);
  return users;
}

/** 密码哈希工具 */
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
