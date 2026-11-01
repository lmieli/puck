import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export type Role = "owner" | "admin" | "editor";
export type User = {
  id: string;
  email: string;
  name: string;
  is_super_admin: number;
};

const COOKIE = "vitrine_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db()
    .prepare(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
    )
    .run(token, userId, expires.toISOString());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.VITRINE_INSECURE_COOKIES !== "1",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.is_super_admin FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .get(token, new Date().toISOString()) as User | undefined;
  return row ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Role of a user on a site: super admins are owners of every site. */
export function roleOn(user: User, siteId: string): Role | null {
  if (user.is_super_admin) return "owner";
  const m = db()
    .prepare("SELECT role FROM memberships WHERE user_id = ? AND site_id = ?")
    .get(user.id, siteId) as { role: Role } | undefined;
  return m?.role ?? null;
}

const rank: Record<Role, number> = { editor: 1, admin: 2, owner: 3 };
export const atLeast = (role: Role | null, min: Role) =>
  !!role && rank[role] >= rank[min];

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
