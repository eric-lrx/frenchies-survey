import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { parseId, sendError } from "../http.js";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { validateSurveyInput } from "../surveys/rules.js";

// Survey Owner routes: F-03 (create, list, detail). Every query is filtered by the session
// owner, so another owner's survey is "not found", exactly like a missing one (F-02).
export const surveysRouter = Router();
surveysRouter.use(requireAuth, requireRole("SURVEY_OWNER"));

const SURVEY_DETAIL = {
  questions: {
    orderBy: { position: "asc" },
    include: { options: { orderBy: { position: "asc" }, select: { id: true, position: true, label: true } } },
  },
} satisfies Prisma.SurveyInclude;

type SurveyWithQuestions = Prisma.SurveyGetPayload<{ include: typeof SURVEY_DETAIL }>;

function surveyDetail(s: SurveyWithQuestions) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    status: s.status,
    ownerId: s.ownerId,
    createdAt: s.createdAt,
    publishedAt: s.publishedAt,
    questions: s.questions.map((q) => ({ id: q.id, position: q.position, text: q.text, type: q.type, options: q.options })),
  };
}

export function surveyNotFound(res: Parameters<typeof sendError>[0]) {
  sendError(res, 404, "NOT_FOUND", "Survey not found.");
}

surveysRouter.get("/", async (req, res, next) => {
  try {
    const surveys = await prisma.survey.findMany({
      where: { ownerId: req.user!.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { _count: { select: { questions: true } } },
    });
    res.json({
      data: surveys.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        createdAt: s.createdAt,
        publishedAt: s.publishedAt,
        questionCount: s._count.questions,
      })),
    });
  } catch (err) {
    next(err);
  }
});

surveysRouter.post("/", async (req, res, next) => {
  try {
    const result = validateSurveyInput(req.body);
    if (!result.ok) {
      sendError(res, 400, "VALIDATION_ERROR", "The survey is not valid.", { fields: result.fields });
      return;
    }
    const { title, description, questions } = result.value;
    // One nested create is one transaction: a failure leaves no partial survey.
    const survey = await prisma.survey.create({
      data: {
        ownerId: req.user!.id,
        title,
        description,
        questions: {
          create: questions.map((q, i) => ({
            position: i + 1,
            text: q.text,
            type: q.type,
            options: { create: q.options.map((label, j) => ({ position: j + 1, label })) },
          })),
        },
      },
      include: SURVEY_DETAIL,
    });
    res.status(201).json({ data: surveyDetail(survey) });
  } catch (err) {
    next(err);
  }
});

surveysRouter.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const survey = id === null ? null : await prisma.survey.findFirst({ where: { id, ownerId: req.user!.id }, include: SURVEY_DETAIL });
    if (!survey) {
      surveyNotFound(res);
      return;
    }
    res.json({ data: surveyDetail(survey) });
  } catch (err) {
    next(err);
  }
});
