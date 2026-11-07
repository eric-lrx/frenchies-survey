import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { resetDatabase, tableCounts } from "./helpers/db.js";
import { createUser, loginCookie } from "./helpers/users.js";
import { createResponse, createSurvey, validAnswers } from "./helpers/surveys.js";

// F-06 Submit response (docs/sprints/sprint-1/F-06-submit-response.md).
const app = createApp();
let ownerId: number;
let respondentId: number;
let cookie: string;
let survey: Awaited<ReturnType<typeof createSurvey>>;

beforeEach(async () => {
  await resetDatabase();
  ownerId = (await createUser("SURVEY_OWNER", { email: "camille@test.local" })).id;
  survey = await createSurvey(ownerId, { status: "PUBLISHED" });
  respondentId = (await createUser("RESPONDENT", { email: "alice@test.local" })).id;
  cookie = await loginCookie(app, "alice@test.local");
});

const submit = (surveyId: number, body: unknown) =>
  request(app).post(`/api/open-surveys/${surveyId}/responses`).set("Cookie", cookie).send(body as object);

const responseCount = () => prisma.response.count({ where: { surveyId: survey.id, respondentId } });

describe("POST /api/open-surveys/:id/responses", () => {
  it("TEST-F06-01 stores a valid response for the session respondent, one answer per question, readable back", async () => {
    const [rating, choice] = survey.questions;
    const res = await submit(survey.id, validAnswers(survey, 4, 2));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      surveyId: survey.id,
      answers: [
        { questionId: rating.id, ratingValue: 4 },
        { questionId: choice.id, optionId: choice.options[2].id },
      ],
    });
    const stored = await prisma.response.findUniqueOrThrow({ where: { id: res.body.data.id }, include: { answers: true } });
    expect(stored.respondentId).toBe(respondentId);
    expect(stored.answers).toHaveLength(2);

    const readBack = await request(app).get(`/api/responses/${res.body.data.id}`).set("Cookie", cookie);
    expect(readBack.status).toBe(200);
    expect(readBack.body.data).toMatchObject({
      id: res.body.data.id,
      surveyId: survey.id,
      surveyTitle: "Spring menu feedback",
      answers: [
        { questionId: rating.id, questionText: "How would you rate the new pastries?", type: "RATING", ratingValue: 4 },
        { questionId: choice.id, questionText: "Which drink did you order?", type: "CHOICE", optionId: choice.options[2].id, optionLabel: "Espresso" },
      ],
    });
  });

  it("TEST-F06-02 refuses a second response from the same respondent with 409, keeping exactly one", async () => {
    await createResponse(survey, respondentId);

    const res = await submit(survey.id, validAnswers(survey, 2, 1));

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { code: "DUPLICATE_RESPONSE", message: "You have already answered this survey." } });
    expect(await responseCount()).toBe(1);
  });

  it("TEST-F06-03 answers a response to a DRAFT survey with 404 and stores nothing", async () => {
    const draft = await createSurvey(ownerId, { title: "Terrace opening" });
    const before = await tableCounts();

    const res = await submit(draft.id, validAnswers(draft));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Survey not found." } });
    expect(await tableCounts()).toEqual(before);
  });

  it("TEST-F06-04 refuses a response to a CLOSED survey with 409 and stores nothing", async () => {
    const closed = await createSurvey(ownerId, { title: "Winter drinks", status: "CLOSED" });
    const before = await tableCounts();

    const res = await submit(closed.id, validAnswers(closed));

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { code: "SURVEY_NOT_OPEN", message: "This survey is closed." } });
    expect(await tableCounts()).toEqual(before);
  });

  it("TEST-F06-05 rejects each broken answer rule with 400 and the matching field, storing nothing", async () => {
    const other = await createSurvey(ownerId, { title: "Barista service", status: "PUBLISHED" });
    const [rating, choice] = survey.questions;
    const goodChoice = { questionId: choice.id, optionId: choice.options[0].id };
    const goodRating = { questionId: rating.id, ratingValue: 3 };
    const cases: [string, unknown, string, string][] = [
      ["one answer missing", { answers: [goodRating] }, `answers[${choice.id}]`, "Please answer this question"],
      ["no answers at all", {}, `answers[${rating.id}]`, "Please answer this question"],
      ["an unknown question", { answers: [goodRating, goodChoice, { questionId: other.questions[0].id, ratingValue: 3 }] }, "answers", "Unknown question"],
      ["a questionId sent as a string", { answers: [goodRating, { questionId: String(choice.id), optionId: choice.options[0].id }] }, "answers", "Unknown question"],
      ["two answers for one question", { answers: [goodRating, { questionId: rating.id, ratingValue: 5 }, goodChoice] }, `answers[${rating.id}]`, "Answer once"],
      ["rating 0", { answers: [{ questionId: rating.id, ratingValue: 0 }, goodChoice] }, `answers[${rating.id}]`, "Choose a rating from 1 to 5"],
      ["rating 6", { answers: [{ questionId: rating.id, ratingValue: 6 }, goodChoice] }, `answers[${rating.id}]`, "Choose a rating from 1 to 5"],
      ["rating 2.5", { answers: [{ questionId: rating.id, ratingValue: 2.5 }, goodChoice] }, `answers[${rating.id}]`, "Choose a rating from 1 to 5"],
      ["an option of another question", { answers: [goodRating, { questionId: choice.id, optionId: other.questions[1].options[0].id }] }, `answers[${choice.id}]`, "Choose one of the options"],
      ["a rating answer with an optionId", { answers: [{ questionId: rating.id, optionId: choice.options[0].id }, goodChoice] }, `answers[${rating.id}]`, "Wrong answer type for this question"],
    ];

    for (const [label, body, field, message] of cases) {
      const before = await tableCounts();
      const res = await submit(survey.id, body);
      expect(res.status, label).toBe(400);
      expect(res.body.error.code, label).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields[field], label).toBe(message);
      expect(await tableCounts(), label).toEqual(before);
    }
  });

  it("TEST-F06-06 stores exactly one response when the same respondent submits twice at the same time", async () => {
    const [a, b] = await Promise.all([submit(survey.id, validAnswers(survey)), submit(survey.id, validAnswers(survey))]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const refused = a.status === 409 ? a : b;
    expect(refused.body.error.code).toBe("DUPLICATE_RESPONSE");
    expect(await responseCount()).toBe(1);
    expect(await prisma.answer.count()).toBe(2);
  });
});

describe("Submitted responses are final", () => {
  it("TEST-F06-07 offers no route to change or delete a response: PUT, PATCH and DELETE get 404 and nothing changes", async () => {
    const response = await createResponse(survey, respondentId, 4, 0);
    const before = await prisma.answer.findMany({ where: { responseId: response.id }, orderBy: { id: "asc" } });

    for (const method of ["put", "patch", "delete"] as const) {
      const res = await request(app)[method](`/api/responses/${response.id}`).set("Cookie", cookie).send({ answers: [] });
      expect(res.status, method).toBe(404);
    }

    expect(await prisma.response.count({ where: { id: response.id } })).toBe(1);
    expect(await prisma.answer.findMany({ where: { responseId: response.id }, orderBy: { id: "asc" } })).toEqual(before);
  });
});

describe("Database constraints behind the API", () => {
  it("refuses a rating outside 1 to 5 and an answer with both or neither value, even written directly", async () => {
    const response = await createResponse(survey, respondentId);
    const [rating, choice] = survey.questions;
    await prisma.answer.deleteMany({ where: { responseId: response.id } });

    await expect(prisma.answer.create({ data: { responseId: response.id, questionId: rating.id, ratingValue: 7 } })).rejects.toThrow();
    await expect(
      prisma.answer.create({ data: { responseId: response.id, questionId: choice.id, ratingValue: 3, optionId: choice.options[0].id } }),
    ).rejects.toThrow();
    await expect(prisma.answer.create({ data: { responseId: response.id, questionId: choice.id } })).rejects.toThrow();
  });
});
