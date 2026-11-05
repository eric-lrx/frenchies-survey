import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { requireAuth, requireRole } from "../src/auth/middleware.js";
import { resetDatabase, tableCounts } from "./helpers/db.js";
import { createUser, loginCookie } from "./helpers/users.js";

// F-02 Role-based access and ownership (docs/sprints/sprint-1/F-02-access-control.md, v1.1).
const app = createApp();

// The role check is tested on a small router, because the routes it protects are added by
// F-03 to F-07 (contract v1.1, section 6). It uses the real sessions of the real app.
const probe = express();
probe.use(cookieParser());
probe.get("/owner-only", requireAuth, requireRole("SURVEY_OWNER"), (req, res) => {
  res.json({ data: { seenBy: req.user!.id } });
});
probe.get("/respondent-only", requireAuth, requireRole("RESPONDENT"), (_req, res) => {
  res.json({ data: "ok" });
});

beforeEach(async () => {
  await resetDatabase();
});

describe("requireRole", () => {
  it("lets the right role through and answers 403 FORBIDDEN to the other role", async () => {
    const owner = await createUser("SURVEY_OWNER", { email: "owner@test.local" });
    await createUser("RESPONDENT", { email: "alice@test.local" });
    const ownerCookie = await loginCookie(app, "owner@test.local");
    const respondentCookie = await loginCookie(app, "alice@test.local");

    const allowed = await request(probe).get("/owner-only").set("Cookie", ownerCookie);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual({ data: { seenBy: owner.id } });

    const forbidden = await request(probe).get("/owner-only").set("Cookie", respondentCookie);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ error: { code: "FORBIDDEN", message: "You do not have access to this action." } });

    expect((await request(probe).get("/respondent-only").set("Cookie", ownerCookie)).status).toBe(403);
  });

  it("answers 401 before 403 when there is no session", async () => {
    const res = await request(probe).get("/owner-only");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("takes the role from the database, not from anything the client sends", async () => {
    const user = await createUser("RESPONDENT", { email: "alice@test.local" });
    const cookie = await loginCookie(app, "alice@test.local");

    const spoofed = await request(probe).get("/owner-only").set("Cookie", cookie).set("X-Role", "SURVEY_OWNER");
    expect(spoofed.status).toBe(403);

    // A role change in the database applies to the very next request of the same session.
    await prisma.user.update({ where: { id: user.id }, data: { role: "SURVEY_OWNER" } });
    expect((await request(probe).get("/owner-only").set("Cookie", cookie)).status).toBe(200);
  });
});

describe("Request bodies must be JSON", () => {
  it("TEST-F02-06 answers a non-JSON body with 415 UNSUPPORTED_MEDIA_TYPE and stores nothing", async () => {
    await createUser("SURVEY_OWNER", { email: "owner@test.local" });
    const cookie = await loginCookie(app, "owner@test.local");
    const before = await tableCounts();

    const res = await request(app)
      .post("/api/surveys")
      .set("Cookie", cookie)
      .set("Content-Type", "text/plain")
      .send("title=Spring menu feedback");

    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Send the request body as JSON." } });
    expect(await tableCounts()).toEqual(before);
  });

  it("blocks a cross-site form post to the login route the same way", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send("email=a%40b.c&password=x");
    expect(res.status).toBe(415);
  });

  it("still accepts body-less POSTs such as logout", async () => {
    await createUser("RESPONDENT", { email: "alice@test.local" });
    const cookie = await loginCookie(app, "alice@test.local");
    expect((await request(app).post("/api/auth/logout").set("Cookie", cookie)).status).toBe(204);
  });
});
