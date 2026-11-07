import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { resetDatabase } from "./helpers/db.js";
import { createUser, loginCookie } from "./helpers/users.js";
import { createSurvey } from "./helpers/surveys.js";

// F-04 Publish survey (docs/sprints/sprint-1/F-04-publish-survey.md, v1.1).
const app = createApp();
let ownerId: number;
let cookie: string;

beforeEach(async () => {
  await resetDatabase();
  ownerId = (await createUser("SURVEY_OWNER", { email: "camille@test.local" })).id;
  cookie = await loginCookie(app, "camille@test.local");
});

const publish = (id: number) => request(app).post(`/api/surveys/${id}/publish`).set("Cookie", cookie);

describe("POST /api/surveys/:id/publish", () => {
  it("TEST-F04-01 publishes the owner's DRAFT survey and sets publishedAt", async () => {
    const survey = await createSurvey(ownerId);

    const res = await publish(survey.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: survey.id, status: "PUBLISHED" });
    expect(Number.isNaN(Date.parse(res.body.data.publishedAt))).toBe(false);
    const stored = await prisma.survey.findUniqueOrThrow({ where: { id: survey.id } });
    expect(stored.status).toBe("PUBLISHED");
    expect(stored.publishedAt).not.toBeNull();
  });

  it("TEST-F04-02 refuses to publish a PUBLISHED or CLOSED survey with 409 and the current status, changing nothing", async () => {
    for (const status of ["PUBLISHED", "CLOSED"] as const) {
      const survey = await createSurvey(ownerId, { status, title: `Already ${status}` });

      const res = await publish(survey.id);

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error: { code: "INVALID_TRANSITION", message: "Only a draft survey can be published.", currentStatus: status },
      });
      const stored = await prisma.survey.findUniqueOrThrow({ where: { id: survey.id } });
      expect(stored.status).toBe(status);
      expect(stored.publishedAt).toEqual(survey.publishedAt);
    }
  });

  it("TEST-F04-03 lets only one of two simultaneous publish requests succeed", async () => {
    const survey = await createSurvey(ownerId);

    const [a, b] = await Promise.all([publish(survey.id), publish(survey.id)]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = a.status === 200 ? a : b;
    const loser = a.status === 200 ? b : a;
    expect(loser.body.error.code).toBe("INVALID_TRANSITION");
    expect(loser.body.error.currentStatus).toBe("PUBLISHED");
    const stored = await prisma.survey.findUniqueOrThrow({ where: { id: survey.id } });
    expect(stored.publishedAt?.toISOString()).toBe(winner.body.data.publishedAt);
  });

  it("TEST-F04-04 refuses to publish a draft without questions (BR-03)", async () => {
    const empty = await prisma.survey.create({ data: { ownerId, title: "Empty draft" } });

    const res = await publish(empty.id);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: "SURVEY_HAS_NO_QUESTIONS", message: "Add at least one question before publishing." },
    });
    const stored = await prisma.survey.findUniqueOrThrow({ where: { id: empty.id } });
    expect(stored.status).toBe("DRAFT");
    expect(stored.publishedAt).toBeNull();
  });

  it("answers an unknown survey with 404", async () => {
    const res = await publish(999999);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
