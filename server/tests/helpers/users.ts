import request from "supertest";
import type { Express } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth/password.js";

// Test-only password for fixture accounts on the test database. Hashed once per run,
// because bcrypt at cost 12 is deliberately slow.
export const TEST_PASSWORD = "Test-Passw0rd!";
let cachedHash: string | undefined;

let counter = 0;

export async function createUser(role: Role, overrides: { name?: string; email?: string; isActive?: boolean } = {}) {
  cachedHash ??= await hashPassword(TEST_PASSWORD);
  counter += 1;
  return prisma.user.create({
    data: {
      name: overrides.name ?? `${role === "SURVEY_OWNER" ? "Owner" : "Respondent"} ${counter}`,
      email: overrides.email ?? `user${counter}-${Date.now()}@test.local`,
      passwordHash: cachedHash,
      role,
      isActive: overrides.isActive ?? true,
    },
  });
}

// Logs in through the real endpoint and returns the session cookie ("cf_session=...").
export async function loginCookie(app: Express, email: string, password = TEST_PASSWORD): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return sessionCookie(res.headers["set-cookie"]);
}

export function sessionCookie(setCookie: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const session = cookies.find((c) => c.startsWith("cf_session="));
  if (!session) throw new Error("no cf_session cookie in the response");
  return session.split(";")[0];
}
