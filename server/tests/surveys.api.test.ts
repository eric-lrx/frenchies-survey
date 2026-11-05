import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { resetDatabase, tableCounts } from "./helpers/db.js";
import { createUser, loginCookie } from "./helpers/users.js";
import { VALID_SURVEY_BODY, createSurvey } from "./helpers/surveys.js";

// F-03 Create survey (docs/sprints/sprint-1/F-03-create-survey.md).
const app = createApp();
let ownerId: number;
let ownerCookie: string;

beforeEach(async () => {
  await resetDatabase();
  ownerId = (await createUser("SURVEY_OWNER", { email: "camille@test.local" })).id;
  ownerCookie = await loginCookie(app, "camille@test.local");
});

describe("POST /api/surveys", () => {
  it("TEST-F03-01 stores a valid survey as DRAFT, owned by the session user whatever the body says, in request order", async () => {
    const res = await request(app)
      .post("/api/surveys")
      .set("Cookie", ownerCookie)
      .send({ ...VALID_SURVEY_BODY, ownerId: 999, status: "PUBLISHED" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: "Spring menu feedback",
      description: "Tell us what you think of the new spring menu.",
      status: "DRAFT",
      ownerId,
      publishedAt: null,
    });
    const [rating, choice] = res.body.data.questions;
    expect(rating).toMatchObject({ position: 1, type: "RATING", options: [], text: "How would you rate the new pastries?" });
    expect(choice).toMatchObject({ position: 2, type: "CHOICE" });
    expect(choice.options.map((o: { position: number; label: string }) => [o.position, o.label])).toEqual([
      [1, "Latte"],
      [2, "Iced tea"],
      [3, "Espresso"],
    ]);

    const stored = await prisma.survey.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(stored.ownerId).toBe(ownerId);
    expect(stored.status).toBe("DRAFT");
  });

  it("trims text and stores an empty description as null", async () => {
    const res = await request(app)
      .post("/api/surveys")
      .set("Cookie", ownerCookie)
      .send({ title: "  Terrace opening  ", description: "   ", questions: [{ text: "  Did you like the terrace?  ", type: "RATING" }] });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Terrace opening");
    expect(res.body.data.description).toBeNull();
    expect(res.body.data.questions[0].text).toBe("Did you like the terrace?");
  });

  const invalidCases: [string, Record<string, unknown>, string][] = [
    ["a title of 2 characters", { ...VALID_SURVEY_BODY, title: "Hi" }, "title"],
    ["no questions", { ...VALID_SURVEY_BODY, questions: [] }, "questions"],
    ["21 questions", { ...VALID_SURVEY_BODY, questions: Array.from({ length: 21 }, (_, i) => ({ text: `Question ${i + 1}`, type: "RATING" })) }, "questions"],
    ["a rating question with options", { ...VALID_SURVEY_BODY, questions: [{ text: "Rate us", type: "RATING", options: ["Good", "Bad"] }] }, "questions[0].options"],
    ["a choice question with 1 option", { ...VALID_SURVEY_BODY, questions: [{ text: "Pick one", type: "CHOICE", options: ["Latte"] }] }, "questions[0].options"],
    ["a choice question with 7 options", { ...VALID_SURVEY_BODY, questions: [{ text: "Pick one", type: "CHOICE", options: ["A", "B", "C", "D", "E", "F", "G"] }] }, "questions[0].options"],
    ["duplicate options ignoring case", { ...VALID_SURVEY_BODY, questions: [{ text: "Pick one", type: "CHOICE", options: ["Latte", "latte"] }] }, "questions[0].options"],
    ["an unknown question type", { ...VALID_SURVEY_BODY, questions: [{ text: "Tell us", type: "TEXT" }] }, "questions[0].type"],
  ];

  it.each(invalidCases)("TEST-F03-02 rejects %s with 400 and the matching field, storing nothing", async (_label, body, field) => {
    const before = await tableCounts();
    const res = await request(app).post("/api/surveys").set("Cookie", ownerCookie).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toHaveProperty([field]);
    expect(await tableCounts()).toEqual(before);
  });

  it("TEST-F03-02 lists every broken rule at once", async () => {
    const res = await request(app)
      .post("/api/surveys")
      .set("Cookie", ownerCookie)
      .send({ title: "", questions: [{ text: "", type: "CHOICE", options: ["Only one"] }] });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["questions[0].options", "questions[0].text", "title"]);
  });
});

describe("GET /api/surveys and /api/surveys/:id", () => {
  it("TEST-F03-03 lists only the signed-in owner's surveys, newest first, and returns one with its questions", async () => {
    const otherOwner = await createUser("SURVEY_OWNER", { email: "lucas@test.local" });
    const older = await createSurvey(ownerId, { title: "Winter drinks" });
    const newer = await createSurvey(ownerId, { title: "Spring menu feedback", status: "PUBLISHED" });
    await createSurvey(otherOwner.id, { title: "Barista service" });
    await prisma.survey.update({ where: { id: older.id }, data: { createdAt: new Date(Date.now() - 60_000) } });

    const list = await request(app).get("/api/surveys").set("Cookie", ownerCookie);
    expect(list.status).toBe(200);
    expect(list.body.data.map((s: { title: string }) => s.title)).toEqual(["Spring menu feedback", "Winter drinks"]);
    expect(list.body.data[0]).toMatchObject({ id: newer.id, status: "PUBLISHED", questionCount: 2 });

    const detail = await request(app).get(`/api/surveys/${older.id}`).set("Cookie", ownerCookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: older.id, title: "Winter drinks", ownerId, status: "DRAFT" });
    expect(detail.body.data.questions).toHaveLength(2);
    expect(detail.body.data.questions[1].options.map((o: { label: string }) => o.label)).toEqual(["Latte", "Iced tea", "Espresso"]);
  });

  it("shows an empty list to an owner without surveys", async () => {
    const res = await request(app).get("/api/surveys").set("Cookie", ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });
});
