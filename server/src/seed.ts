import type { PrismaClient, QuestionType, Role, SurveyStatus } from "@prisma/client";
import { hashPassword } from "./auth/password.js";

// Demo data (F-08 contract v1.1, section 2). Idempotent: users are upserted by email, a
// survey is created only when its owner has no survey with that title, and a response only
// when that respondent has none for the survey, so running the seed again changes nothing.
// The data set grows with the features (F-01 users, F-03 surveys, F-06 responses).
const DEMO_USERS: { name: string; email: string; role: Role }[] = [
  { name: "Camille Martin", email: "camille@cafe.test", role: "SURVEY_OWNER" },
  { name: "Lucas Bernard", email: "lucas@cafe.test", role: "SURVEY_OWNER" },
  { name: "Alice Dupont", email: "alice@customer.test", role: "RESPONDENT" },
  { name: "Bruno Petit", email: "bruno@customer.test", role: "RESPONDENT" },
  { name: "Chloé Moreau", email: "chloe@customer.test", role: "RESPONDENT" },
];

interface DemoSurvey {
  owner: string;
  title: string;
  description: string;
  status: SurveyStatus;
  publishedAt?: string;
  closedAt?: string;
  questions: { text: string; type: QuestionType; options?: string[] }[];
}

const DEMO_SURVEYS: DemoSurvey[] = [
  {
    owner: "camille@cafe.test",
    title: "Spring menu feedback",
    description: "Tell us what you think of the new spring menu.",
    status: "PUBLISHED",
    publishedAt: "2026-11-02T02:00:00Z",
    questions: [
      { text: "How would you rate the new pastries?", type: "RATING" },
      { text: "Which drink did you order?", type: "CHOICE", options: ["Latte", "Iced tea", "Espresso", "Hot chocolate"] },
    ],
  },
  {
    owner: "camille@cafe.test",
    title: "Terrace opening",
    description: "We are thinking of opening a terrace this summer.",
    status: "DRAFT",
    questions: [
      { text: "How much would you enjoy sitting on a terrace?", type: "RATING" },
      { text: "When would you sit outside?", type: "CHOICE", options: ["Morning", "Lunch", "Afternoon"] },
    ],
  },
  {
    owner: "camille@cafe.test",
    title: "Winter drinks",
    description: "Last winter's seasonal drinks.",
    status: "CLOSED",
    publishedAt: "2026-01-10T02:00:00Z",
    closedAt: "2026-03-01T02:00:00Z",
    questions: [
      { text: "How was the winter drink menu?", type: "RATING" },
      { text: "Which winter drink was your favourite?", type: "CHOICE", options: ["Chai latte", "Spiced apple juice", "Hot chocolate"] },
    ],
  },
  {
    owner: "lucas@cafe.test",
    title: "Barista service",
    description: "How was the service at the counter today?",
    status: "PUBLISHED",
    publishedAt: "2026-11-03T02:00:00Z",
    questions: [
      { text: "How friendly was the barista?", type: "RATING" },
      { text: "How quickly was your order ready?", type: "RATING" },
    ],
  },
];

// Demo responses: [respondent, survey title, rating of question 1, option label of question 2].
const DEMO_RESPONSES: [string, string, number, string][] = [
  ["alice@customer.test", "Spring menu feedback", 5, "Latte"],
  ["bruno@customer.test", "Spring menu feedback", 3, "Espresso"],
  ["chloe@customer.test", "Winter drinks", 4, "Hot chocolate"],
];

export async function seedDatabase(prisma: PrismaClient, password: string) {
  if (!password) {
    throw new Error("SEED_PASSWORD is required to give the demo accounts a password.");
  }
  // Hashed once; an existing account keeps its current password and hash.
  const passwordHash = await hashPassword(password);

  const ids = new Map<string, number>();
  for (const user of DEMO_USERS) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, isActive: true },
      create: { ...user, passwordHash },
    });
    ids.set(user.email, saved.id);
  }

  for (const survey of DEMO_SURVEYS) {
    const ownerId = ids.get(survey.owner)!;
    const existing = await prisma.survey.findFirst({ where: { ownerId, title: survey.title } });
    if (existing) continue;
    await prisma.survey.create({
      data: {
        ownerId,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        publishedAt: survey.publishedAt ? new Date(survey.publishedAt) : null,
        closedAt: survey.closedAt ? new Date(survey.closedAt) : null,
        questions: {
          create: survey.questions.map((q, i) => ({
            position: i + 1,
            text: q.text,
            type: q.type,
            options: { create: (q.options ?? []).map((label, j) => ({ position: j + 1, label })) },
          })),
        },
      },
    });
  }

  for (const [email, title, rating, label] of DEMO_RESPONSES) {
    const respondentId = ids.get(email)!;
    const survey = await prisma.survey.findFirstOrThrow({
      where: { title },
      include: { questions: { orderBy: { position: "asc" }, include: { options: true } } },
    });
    const existing = await prisma.response.findUnique({ where: { surveyId_respondentId: { surveyId: survey.id, respondentId } } });
    if (existing) continue;
    const [ratingQuestion, choiceQuestion] = survey.questions;
    const option = choiceQuestion.options.find((o) => o.label === label)!;
    await prisma.response.create({
      data: {
        surveyId: survey.id,
        respondentId,
        answers: {
          create: [
            { questionId: ratingQuestion.id, ratingValue: rating },
            { questionId: choiceQuestion.id, optionId: option.id },
          ],
        },
      },
    });
  }
}
