import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { HttpError, parseId, sendError } from "../http.js";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { validateAnswers } from "../surveys/rules.js";
import { surveyNotFound } from "./surveys.js";

// Respondent routes: F-05 (browse and open PUBLISHED surveys) and F-06 (submit a response).
// A respondent sees only what is needed to answer: no owner, no status, no count, no other
// respondent's answer (BR-10).
export const openSurveysRouter = Router();
openSurveysRouter.use(requireAuth, requireRole("RESPONDENT"));

async function respondedSurveyIds(respondentId: number, surveyIds: number[]): Promise<Set<number>> {
  // One query for the whole list, not one per survey (F-05 contract, section 4).
  const rows = await prisma.response.findMany({ where: { respondentId, surveyId: { in: surveyIds } }, select: { surveyId: true } });
  return new Set(rows.map((r) => r.surveyId));
}

openSurveysRouter.get("/", async (req, res, next) => {
  try {
    const surveys = await prisma.survey.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      select: { id: true, title: true, description: true, publishedAt: true, _count: { select: { questions: true } } },
    });
    const answered = await respondedSurveyIds(req.user!.id, surveys.map((s) => s.id));
    res.json({
      data: surveys.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        publishedAt: s.publishedAt,
        questionCount: s._count.questions,
        alreadyResponded: answered.has(s.id),
      })),
    });
  } catch (err) {
    next(err);
  }
});

openSurveysRouter.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const survey =
      id === null
        ? null
        : await prisma.survey.findFirst({
            where: { id, status: "PUBLISHED" },
            select: {
              id: true,
              title: true,
              description: true,
              questions: {
                orderBy: { position: "asc" },
                select: {
                  id: true,
                  position: true,
                  text: true,
                  type: true,
                  options: { orderBy: { position: "asc" }, select: { id: true, position: true, label: true } },
                },
              },
            },
          });
    if (!survey) {
      surveyNotFound(res);
      return;
    }
    const answered = await respondedSurveyIds(req.user!.id, [survey.id]);
    res.json({ data: { ...survey, alreadyResponded: answered.has(survey.id) } });
  } catch (err) {
    next(err);
  }
});

const duplicate = () => new HttpError(409, "DUPLICATE_RESPONSE", "You have already answered this survey.");
const closed = () => new HttpError(409, "SURVEY_NOT_OPEN", "This survey is closed.");

// F-06: checks in the order of the contract (section 1): survey visible and open, not yet
// answered, answers valid; then one transaction that re-reads the status and inserts the
// response with its answers. The unique key (surveyId, respondentId) is the final guard
// against two simultaneous submissions (NFR-04).
openSurveysRouter.post("/:id/responses", async (req, res, next) => {
  try {
    const surveyId = parseId(req.params.id);
    const respondentId = req.user!.id;
    const survey =
      surveyId === null
        ? null
        : await prisma.survey.findUnique({
            where: { id: surveyId },
            select: {
              id: true,
              status: true,
              questions: { orderBy: { position: "asc" }, select: { id: true, type: true, options: { select: { id: true } } } },
            },
          });
    if (!survey || survey.status === "DRAFT") {
      surveyNotFound(res);
      return;
    }
    if (survey.status === "CLOSED") throw closed();

    const already = await prisma.response.findUnique({ where: { surveyId_respondentId: { surveyId: survey.id, respondentId } }, select: { id: true } });
    if (already) throw duplicate();

    const result = validateAnswers(
      survey.questions.map((q) => ({ id: q.id, type: q.type, optionIds: q.options.map((o) => o.id) })),
      req.body,
    );
    if (!result.ok) {
      sendError(res, 400, "VALIDATION_ERROR", "Some answers are missing or invalid.", { fields: result.fields });
      return;
    }

    const response = await prisma.$transaction(async (tx) => {
      const current = await tx.survey.findUniqueOrThrow({ where: { id: survey.id }, select: { status: true } });
      if (current.status !== "PUBLISHED") throw closed();
      return tx.response.create({
        data: { surveyId: survey.id, respondentId, answers: { create: result.value } },
        include: { answers: { select: { questionId: true, ratingValue: true, optionId: true } } },
      });
    });

    const order = new Map(survey.questions.map((q, i) => [q.id, i]));
    res.status(201).json({
      data: {
        id: response.id,
        surveyId: response.surveyId,
        submittedAt: response.submittedAt,
        answers: response.answers
          .sort((a, b) => order.get(a.questionId)! - order.get(b.questionId)!)
          .map((a) => (a.ratingValue !== null ? { questionId: a.questionId, ratingValue: a.ratingValue } : { questionId: a.questionId, optionId: a.optionId })),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      next(duplicate());
      return;
    }
    next(err);
  }
});
