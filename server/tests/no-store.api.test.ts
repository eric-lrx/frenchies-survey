import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app.js";
import { resetDatabase } from "./helpers/db.js";
import { createUser, loginCookie } from "./helpers/users.js";
import { createSurvey } from "./helpers/surveys.js";

// UAT finding #46 (UAT-04 step 7): after "Sign out", the browser Back button showed the
// previous user's "Open surveys" page again. The API already answered 401, so the page came
// from the browser's caches. Protected pages and protected API responses must not be stored.
const app = createApp();
let staticDir: string;
let respondentCookie: string;
let ownerCookie: string;

function expectNoStore(res: request.Response) {
  expect(res.headers["cache-control"]).toBeDefined();
  expect(res.headers["cache-control"]).toContain("no-store");
  expect(res.headers["pragma"]).toBe("no-cache");
}

beforeAll(() => {
  staticDir = mkdtempSync(join(tmpdir(), "cafe-nostore-"));
  mkdirSync(join(staticDir, "assets"));
  writeFileSync(join(staticDir, "index.html"), "<!doctype html><title>Café Feedback</title><div id=root></div>");
  writeFileSync(join(staticDir, "assets", "app.js"), "console.log('app');");
});

afterAll(() => {
  rmSync(staticDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetDatabase();
  const owner = await createUser("SURVEY_OWNER", { email: "camille@test.local" });
  await createSurvey(owner.id, { title: "Spring menu feedback", status: "PUBLISHED" });
  await createUser("RESPONDENT", { email: "bruno@test.local" });
  respondentCookie = await loginCookie(app, "bruno@test.local");
  ownerCookie = await loginCookie(app, "camille@test.local");
});

describe("#46 protected API responses are never stored by the browser", () => {
  it("GET /api/open-surveys (the Open surveys page) sends Cache-Control no-store", async () => {
    const res = await request(app).get("/api/open-surveys").set("Cookie", respondentCookie);
    expect(res.status).toBe(200);
    expectNoStore(res);
  });

  it("GET /api/surveys (My surveys) sends Cache-Control no-store", async () => {
    const res = await request(app).get("/api/surveys").set("Cookie", ownerCookie);
    expect(res.status).toBe(200);
    expectNoStore(res);
  });

  it("GET /api/auth/session and /api/auth/me send Cache-Control no-store", async () => {
    expectNoStore(await request(app).get("/api/auth/session").set("Cookie", respondentCookie));
    expectNoStore(await request(app).get("/api/auth/me").set("Cookie", respondentCookie));
  });

  it("the 401 after sign-out is not stored either", async () => {
    await request(app).post("/api/auth/logout").set("Cookie", respondentCookie);
    const res = await request(app).get("/api/open-surveys").set("Cookie", respondentCookie);
    expect(res.status).toBe(401);
    expectNoStore(res);
  });
});

describe("#46 the app page is not stored, public files keep their cache", () => {
  it("the page served for /surveys and /owner/surveys sends Cache-Control no-store", async () => {
    const web = createApp({ staticDir });
    for (const path of ["/surveys", "/owner/surveys", "/responses/7"]) {
      const res = await request(web).get(path);
      expect(res.status).toBe(200);
      expectNoStore(res);
    }
  });

  it("built assets and public health checks are unchanged (no no-store)", async () => {
    const web = createApp({ staticDir });
    const asset = await request(web).get("/assets/app.js");
    expect(asset.status).toBe(200);
    expect(asset.headers["cache-control"]).toContain("max-age=31536000");
    expect(asset.headers["cache-control"]).not.toContain("no-store");

    const health = await request(web).get("/api/health");
    expect(health.headers["cache-control"] ?? "").not.toContain("no-store");
  });
});
