import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { User, UserSession } from "@/entities";
import { getDataSource } from "@/lib/db";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const ds = await getDataSource();

  await ds.getRepository(UserSession).save({
    tokenHash: hashToken(token),
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const ds = await getDataSource();
  const sessionRepo = ds.getRepository(UserSession);
  const session = await sessionRepo.findOne({
    where: { tokenHash: hashToken(token) },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) await sessionRepo.delete(session.id);
    return null;
  }

  const user = await ds.getRepository(User).findOne({ where: { id: session.userId } });
  if (!user) {
    await sessionRepo.delete(session.id);
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    phone: user.phone,
    permissionLevel: user.permissionLevel,
  };
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.permissionLevel !== 0) redirect("/");
  return user;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const ds = await getDataSource();
    await ds.getRepository(UserSession).delete({ tokenHash: hashToken(token) });
  }
  cookieStore.delete(COOKIE_NAME);
}
