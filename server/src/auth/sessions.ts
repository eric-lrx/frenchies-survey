import crypto from "node:crypto";
import type { CookieOptions, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../prisma.js";
import { settings } from "../config.js";

// F-01 contract, section 1: database-backed sessions (D-04). The browser holds a random
// token; the database holds only its SHA-256 hash and an expiry 8 hours ahead.
export const SESSION_COOKIE = "cf_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookieOptions(): CookieOptions {
  return { httpOnly: true, sameSite: "lax", secure: settings.isProduction, path: "/" };
}

export async function startSession(res: Response, userId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_TTL_MS });
}

// Returns the active user of a session token, or null. An expired session is deleted on
// the way, and a deactivated account no longer counts as signed in.
export async function findSessionUser(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (!session.user.isActive) return null;
  const { isActive: _isActive, ...user } = session.user;
  return user;
}

export async function endSession(res: Response, token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}
