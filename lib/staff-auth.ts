import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { prisma } from "@/lib/db";
import { ADMIN_ID } from "@/lib/fixture";

export const STAFF_COOKIE = "ksa_staff";
const TTL_MS = 12 * 60 * 60 * 1000;
const FAILURE_LIMIT = 8;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

export type StaffSession = { id: string; nama: string; role: "admin" | "reviewer" };

declare module "hono" {
  interface ContextVariableMap {
    staff: StaffSession;
  }
}

const failures = new Map<string, { count: number; reset: number }>();

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function checkPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function loginLimited(userId: string) {
  const row = failures.get(userId);
  return row != null && row.reset > Date.now() && row.count >= FAILURE_LIMIT;
}

export function recordLoginFailure(userId: string) {
  const now = Date.now();
  const row = failures.get(userId);
  if (!row || row.reset <= now) {
    failures.set(userId, { count: 1, reset: now + FAILURE_WINDOW_MS });
    return;
  }
  row.count += 1;
}

export function clearLoginFailures(userId: string) {
  failures.delete(userId);
}

function secret() {
  const value = process.env.STAFF_SECRET;
  if (!value) {
    throw new Error("STAFF_SECRET is not set");
  }
  return value;
}

export function signStaffToken(id: string) {
  const body = Buffer.from(JSON.stringify({ id, exp: Date.now() + TTL_MS })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function staffIdFromToken(token: string | undefined) {
  if (!token) {
    return null;
  }
  const [body, sig] = token.split(".");
  if (!body || !sig) {
    return null;
  }
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const actual = Buffer.from(sig);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as { id?: string; exp?: number };
    if (!parsed.id || parsed.exp == null || parsed.exp < Date.now()) {
      return null;
    }
    return parsed.id;
  } catch {
    return null;
  }
}

export async function loadStaff(id: string): Promise<StaffSession | null> {
  const user = await prisma.user.findFirst({
    where: { id, retiredAt: null, role: { in: ["admin", "reviewer"] } },
    select: { id: true, nama: true, role: true },
  });
  if (!user || (user.role !== "admin" && user.role !== "reviewer")) {
    return null;
  }
  return { id: user.id, nama: user.nama, role: user.role };
}

let fixtureStaff: StaffSession | null | undefined;

async function vitestStaff() {
  if (fixtureStaff !== undefined) {
    return fixtureStaff;
  }
  fixtureStaff = await loadStaff(ADMIN_ID);
  return fixtureStaff;
}

export async function staffForRequest(c: Context): Promise<StaffSession | null> {
  try {
    const id = staffIdFromToken(getCookie(c, STAFF_COOKIE));
    if (id) {
      return loadStaff(id);
    }
  } catch {
    return null;
  }
  if (process.env.VITEST === "true" && c.req.header("x-staff-test") !== "anon") {
    return vitestStaff();
  }
  return null;
}

export function writeStaffCookie(c: Context, id: string) {
  setCookie(c, STAFF_COOKIE, signStaffToken(id), {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: TTL_MS / 1000,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearStaffCookie(c: Context) {
  deleteCookie(c, STAFF_COOKIE, { path: "/" });
}

export function isOpenRoute(method: string, path: string) {
  const route = path.startsWith("/api") ? path.slice(4) : path;
  if (method === "GET" && (route === "/health" || route === "/docs" || route === "/docs/ui" || route === "/auth/staff")) {
    return true;
  }
  if (method === "POST" && (route === "/auth/login" || route === "/auth/logout" || route === "/counts/sync")) {
    return true;
  }
  if (method === "GET" && /^\/sessions\/[^/]+\/(counters|prepare)$/.test(route)) {
    return true;
  }
  if (method === "POST" && /^\/sessions\/[^/]+\/(bind|devices\/release)$/.test(route)) {
    return true;
  }
  return false;
}
