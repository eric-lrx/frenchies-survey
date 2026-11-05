import type { SurveyStatus } from "@prisma/client";
import { prisma } from "../../src/prisma.js";

// A survey with one rating and one choice question, created directly in the test database
// so a test can start from any status without going through other features' routes.
export async function createSurvey(ownerId: number, overrides: { title?: string; status?: SurveyStatus } = {}) {
  const status = overrides.status ?? "DRAFT";
  return prisma.survey.create({
    data: {
      ownerId,
      title: overrides.title ?? "Spring menu feedback",
      description: "Tell us what you think of the new spring menu.",
      status,
      publishedAt: status === "DRAFT" ? null : new Date(),
      closedAt: status === "CLOSED" ? new Date() : null,
      questions: {
        create: [
          { position: 1, text: "How would you rate the new pastries?", type: "RATING" },
          {
            position: 2,
            text: "Which drink did you order?",
            type: "CHOICE",
            options: { create: [{ position: 1, label: "Latte" }, { position: 2, label: "Iced tea" }, { position: 3, label: "Espresso" }] },
          },
        ],
      },
    },
    include: { questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } } },
  });
}

export const VALID_SURVEY_BODY = {
  title: "Spring menu feedback",
  description: "Tell us what you think of the new spring menu.",
  questions: [
    { text: "How would you rate the new pastries?", type: "RATING" },
    { text: "Which drink did you order?", type: "CHOICE", options: ["Latte", "Iced tea", "Espresso"] },
  ],
};
