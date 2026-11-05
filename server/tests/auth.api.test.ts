import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { resetDatabase } from "./helpers/db.js";
import { PROTECTED_ROUTES } from "./helpers/routes.js";
import { TEST_PASSWORD, createUser, loginCookie } from "./helpers/users.js";

// F-01 Authentication (docs/sprints/sprint-1/F-01-authentication.md).
const app = createApp();

beforeEach(async () => {
  await resetDatabase();
});

describe("POST /api/auth/login", () => {
  it("TEST-F01-01 signs in with the right password, sets an HttpOnly session cookie and returns the identity", async () => {
    const owner = await createUser("SURVEY_OWNER", { name: "Camille Martin", email: "camille@test.local" });

    const res = await request(app).post("/api/auth/login").send({ email: "camille@test.local", password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { id: owner.id, name: "Camille Martin", email: "camille@test.local", role: "SURVEY_OWNER" },
    });
    const cookie = [res.headers["set-cookie"]].flat().find((c: string) => c.startsWith("cf_session="));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(await prisma.session.count({ where: { userId: owner.id } })).toBe(1);
  });

  it("accepts the email in any case and with surrounding spaces", async () => {
    await createUser("RESPONDENT", { email: "alice@test.local" });
    const res = await request(app).post("/api/auth/login").send({ email: "  Alice@Test.Local ", password: TEST_PASSWORD });
    expect(res.status).toBe(200);
  });

  it("TEST-F01-02 gives the same 401 for a wrong password, an unknown email and an inactive account, and sets no cookie", async () => {
    await createUser("RESPONDENT", { email: "bruno@test.local" });
    await createUser("RESPONDENT", { email: "gone@test.local", isActive: false });

    const wrongPassword = await request(app).post("/api/auth/login").send({ email: "bruno@test.local", password: "Wrong-Passw0rd!" });
    const unknownEmail = await request(app).post("/api/auth/login").send({ email: "nobody@test.local", password: TEST_PASSWORD });
    const inactive = await request(app).post("/api/auth/login").send({ email: "gone@test.local", password: TEST_PASSWORD });

    for (const res of [wrongPassword, unknownEmail, inactive]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
      expect(res.headers["set-cookie"]).toBeUndefined();
    }
    expect(await prisma.session.count()).toBe(0);
  });

  it("TEST-F01-07 rejects a missing email or password with 400 before looking anything up", async () => {
    const empty = await request(app).post("/api/auth/login").send({});
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe("VALIDATION_ERROR");
    expect(empty.body.error.fields).toMatchObject({ email: "Required", password: "Required" });

    const noPassword = await request(app).post("/api/auth/login").send({ email: "camille@test.local", password: "" });
    expect(noPassword.status).toBe(400);
    expect(noPassword.body.error.fields).toEqual({ password: "Required" });
  });
});

describe("GET /api/auth/me", () => {
  it("TEST-F01-03 returns the signed-in identity and role, and never the password hash", async () => {
    const respondent = await createUser("RESPONDENT", { name: "Alice", email: "alice@test.local" });
    const cookie = await loginCookie(app, "alice@test.local");

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { id: respondent.id, name: "Alice", email: "alice@test.local", role: "RESPONDENT" } });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it("rejects an expired session with 401 and deletes it", async () => {
    await createUser("RESPONDENT", { email: "alice@test.local" });
    const cookie = await loginCookie(app, "alice@test.local");
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(await prisma.session.count()).toBe(0);
  });

  it("rejects a session whose user has been deactivated", async () => {
    const user = await createUser("RESPONDENT", { email: "alice@test.local" });
    const cookie = await loginCookie(app, "alice@test.local");
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/session", () => {
  it("TEST-F01-08 always answers 200: null without a valid session, the identity (no hash) with one", async () => {
    const anonymous = await request(app).get("/api/auth/session");
    expect(anonymous.status).toBe(200);
    expect(anonymous.body).toEqual({ data: null });

    const user = await createUser("RESPONDENT", { name: "Alice", email: "alice@test.local" });
    const cookie = await loginCookie(app, "alice@test.local");
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await request(app).get("/api/auth/session").set("Cookie", cookie);
    expect(expired.status).toBe(200);
    expect(expired.body).toEqual({ data: null });

    const fresh = await loginCookie(app, "alice@test.local");
    const valid = await request(app).get("/api/auth/session").set("Cookie", fresh);
    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({ data: { id: user.id, name: "Alice", email: "alice@test.local", role: "RESPONDENT" } });
    expect(JSON.stringify(valid.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe("POST /api/auth/logout", () => {
  it("TEST-F01-04 ends the session on the server, so the old cookie value gets 401 afterwards", async () => {
    await createUser("SURVEY_OWNER", { email: "camille@test.local" });
    const cookie = await loginCookie(app, "camille@test.local");

    const logout = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(logout.status).toBe(204);
    expect(sessionCookieCleared(logout.headers["set-cookie"])).toBe(true);
    expect(await prisma.session.count()).toBe(0);

    // A copy of the cookie made before logout must not work any more.
    const replay = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("only ends its own session: another session of the same user stays valid", async () => {
    await createUser("SURVEY_OWNER", { email: "camille@test.local" });
    const laptop = await loginCookie(app, "camille@test.local");
    const phone = await loginCookie(app, "camille@test.local");

    await request(app).post("/api/auth/logout").set("Cookie", laptop);

    expect((await request(app).get("/api/auth/me").set("Cookie", phone)).status).toBe(200);
  });
});

describe("Protected routes without a session", () => {
  it("TEST-F01-05 answers every protected route with 401 UNAUTHENTICATED and no private data", async () => {
    for (const route of PROTECTED_ROUTES) {
      const res = await request(app)[route.method](route.path);
      expect(res.status, `${route.method.toUpperCase()} ${route.path}`).toBe(401);
      expect(res.body).toEqual({ error: { code: "UNAUTHENTICATED", message: "Please sign in." } });
    }
  });

  it("treats a forged cookie value like no session", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "cf_session=forged-token-value");
    expect(res.status).toBe(401);
  });
});

function sessionCookieCleared(setCookie: string | string[] | undefined): boolean {
  const cookies = [setCookie].flat().filter(Boolean) as string[];
  return cookies.some((c) => c.startsWith("cf_session=;") && /Expires=Thu, 01 Jan 1970/i.test(c));
}

