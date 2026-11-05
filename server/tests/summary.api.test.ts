import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { resetDatabase } from "./helpers/db.js";
import { createUser, loginCookie } from "./helpers/users.js";
import { createResponse, createSurvey } from "./helpers/surveys.js";

// F-07 Aggregate summary (docs/sprints/sprint-1/F-07-aggregate-summary.md).
const app = createApp();
let ownerId: number;
let cookie: string;
let survey: Awaited<ReturnType<typeof createSurvey>>;
const respondents: { id: number; name: string; email: string }[] = [];

beforeEach(async () => {
  await resetDatabase();
  respondents.length = 0;
  ownerId = (await createUser("SURVEY_OWNER", { email: "camille@test.local" })).id;
  cookie = await loginCookie(app, "camille@test.local");
  survey = await createSurvey(ownerId, { status: "PUBLISHED" });
  for (const name of ["Alice Dupont", "Bruno Petit", "Chloe Moreau"]) {
    const email = `${name.split(" ")[0].toLowerCase()}@test.local`;
    respondents.push(await createUser("RESPONDENT", { name, email }));
  }
});

const summary = (id: number) => request(app).get(`/api/surveys/${id}/summary`).set("Cookie", cookie);

describe("GET /api/surveys/:id/summary", () => {
  it("TEST-F07-01 returns counts, averages and option counts equal to direct database counts for this survey only", async () => {
    // Ratings 5, 4, 4 and choices Latte (index 0), Latte, Espresso (index 2).
    await createResponse(survey, respondents[0].id, 5, 0);
    await createResponse(survey, respondents[1].id, 4, 0);
    await createResponse(survey, respondents[2].id, 4, 2);
    // Noise on another survey that must not be counted.
    const other = await createSurvey(ownerId, { title: "Barista service", status: "PUBLISHED" });
    await createResponse(other, respondents[0].id, 1, 1);

    const res = await summary(survey.id);

    expect(res.status).toBe(200);
    const [rating, choice] = survey.questions;
    expect(res.body.data).toEqual({
      surveyId: survey.id,
      title: "Spring menu feedback",
      status: "PUBLISHED",
      responseCount: 3,
      questions: [
        {
          questionId: rating.id,
          position: 1,
          text: "How would you rate the new pastries?",
          type: "RATING",
          average: 4.3,
          distribution: { "1": 0, "2": 0, "3": 0, "4": 2, "5": 1 },
        },
        {
          questionId: choice.id,
          position: 2,
          text: "Which drink did you order?",
          type: "CHOICE",
          options: [
            { optionId: choice.options[0].id, label: "Latte", count: 2 },
            { optionId: choice.options[1].id, label: "Iced tea", count: 0 },
            { optionId: choice.options[2].id, label: "Espresso", count: 1 },
          ],
        },
      ],
    });

    // The same figures, counted directly in the database for this survey.
    expect(res.body.data.responseCount).toBe(await prisma.response.count({ where: { surveyId: survey.id } }));
    const ratings = await prisma.answer.findMany({ where: { questionId: rating.id }, select: { ratingValue: true } });
    const direct = Math.round((10 * ratings.reduce((sum, a) => sum + a.ratingValue!, 0)) / ratings.length) / 10;
    expect(res.body.data.questions[0].average).toBe(direct);
    for (const [index, option] of choice.options.entries()) {
      expect(res.body.data.questions[1].options[index].count).toBe(await prisma.answer.count({ where: { optionId: option.id } }));
    }
  });

  it("TEST-F07-02 gives zero counts and empty averages for a survey with no response", async () => {
    const res = await summary(survey.id);

    expect(res.status).toBe(200);
    expect(res.body.data.responseCount).toBe(0);
    expect(res.body.data.questions[0]).toMatchObject({ average: null, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } });
    expect(res.body.data.questions[1].options.map((o: { count: number }) => o.count)).toEqual([0, 0, 0]);
  });

  it("TEST-F07-03 contains no respondent identity and no individual response", async () => {
    for (const r of respondents) await createResponse(survey, r.id, 3, 1);

    const res = await summary(survey.id);
    const json = JSON.stringify(res.body);

    for (const r of respondents) {
      expect(json).not.toContain(r.name);
      expect(json).not.toContain(r.email);
      expect(json).not.toMatch(new RegExp(`"(respondentId|userId|id)":${r.id}[,}]`));
    }
    expect(json).not.toContain('"respondentId"');
    expect(json).not.toContain('"answers"');
    expect(json).not.toContain('"responses"');
  });

  it("works for a survey in any status, including a draft", async () => {
    const draft = await createSurvey(ownerId, { title: "Terrace opening" });
    const res = await summary(draft.id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: "DRAFT", responseCount: 0 });
  });
});
