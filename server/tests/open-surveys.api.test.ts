import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { resetDatabase } from "./helpers/db.js";
import { createUser, loginCookie } from "./helpers/users.js";
import { createSurvey } from "./helpers/surveys.js";

// F-05 Browse open surveys (docs/sprints/sprint-1/F-05-browse-open-surveys.md, v1.1).
const app = createApp();
const FORBIDDEN_KEYS = ["ownerId", "responseCount", "status", "answers"];

let cookie: string;
let draft: Awaited<ReturnType<typeof createSurvey>>;
let older: Awaited<ReturnType<typeof createSurvey>>;
let newer: Awaited<ReturnType<typeof createSurvey>>;
let closed: Awaited<ReturnType<typeof createSurvey>>;

beforeEach(async () => {
  await resetDatabase();
  const owner = await createUser("SURVEY_OWNER", { email: "camille@test.local" });
  draft = await createSurvey(owner.id, { title: "Terrace opening" });
  older = await createSurvey(owner.id, { title: "Spring menu feedback", status: "PUBLISHED" });
  newer = await createSurvey(owner.id, { title: "Barista service", status: "PUBLISHED" });
  closed = await createSurvey(owner.id, { title: "Winter drinks", status: "CLOSED" });
  await prisma.survey.update({ where: { id: older.id }, data: { publishedAt: new Date("2026-11-01T02:00:00Z") } });
  await prisma.survey.update({ where: { id: newer.id }, data: { publishedAt: new Date("2026-11-03T02:00:00Z") } });
  await createUser("RESPONDENT", { email: "alice@test.local" });
  cookie = await loginCookie(app, "alice@test.local");
});

function expectNoForbiddenKeys(body: unknown) {
  const json = JSON.stringify(body);
  for (const key of FORBIDDEN_KEYS) expect(json).not.toContain(`"${key}"`);
}

describe("GET /api/open-surveys", () => {
  it("TEST-F05-01 lists every PUBLISHED survey and no DRAFT or CLOSED one, newest publication first", async () => {
    const res = await request(app).get("/api/open-surveys").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.map((s: { id: number }) => s.id)).toEqual([newer.id, older.id]);
    expect(res.body.data[0]).toMatchObject({
      id: newer.id,
      title: "Barista service",
      description: "Tell us what you think of the new spring menu.",
      publishedAt: "2026-11-03T02:00:00.000Z",
      questionCount: 2,
    });
    expectNoForbiddenKeys(res.body);
  });
});

describe("GET /api/open-surveys/:id", () => {
  it("TEST-F05-02 opens a PUBLISHED survey with ordered questions and options, and nothing owner-private", async () => {
    const res = await request(app).get(`/api/open-surveys/${older.id}`).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: older.id, title: "Spring menu feedback" });
    expect(res.body.data.questions.map((q: { position: number; type: string }) => [q.position, q.type])).toEqual([
      [1, "RATING"],
      [2, "CHOICE"],
    ]);
    expect(res.body.data.questions[1].options.map((o: { label: string }) => o.label)).toEqual(["Latte", "Iced tea", "Espresso"]);
    expectNoForbiddenKeys(res.body);
  });

  it("TEST-F05-02 answers a DRAFT, a CLOSED and an unknown survey with the same 404", async () => {
    for (const id of [draft.id, closed.id, 999999]) {
      const res = await request(app).get(`/api/open-surveys/${id}`).set("Cookie", cookie);
      expect(res.status, `survey ${id}`).toBe(404);
      expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Survey not found." } });
    }
  });
});
