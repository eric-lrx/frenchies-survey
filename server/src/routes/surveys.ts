import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { parseId, sendError } from "../http.js";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { validateSurveyInput } from "../surveys/rules.js";
import { computeSummary } from "../surveys/summary.js";

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
      include: { _count: { select: { questions: true, responses: true } } },
    });
    res.json({
      data: surveys.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        createdAt: s.createdAt,
        publishedAt: s.publishedAt,
        questionCount: s._count.questions,
        responseCount: s._count.responses,
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

// F-09: edit a DRAFT survey. Only drafts can be edited (BR-04). The whole survey is replaced
// in one transaction: old questions are deleted and new ones created.
surveysRouter.put("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      surveyNotFound(res);
      return;
    }
    const ownerId = req.user!.id;
    const survey = await prisma.survey.findFirst({ where: { id, ownerId }, select: { status: true } });
    if (!survey) {
      surveyNotFound(res);
      return;
    }
    if (survey.status !== "DRAFT") {
      sendError(res, 409, "NOT_A_DRAFT", "Only a draft survey can be edited.");
      return;
    }
    const result = validateSurveyInput(req.body);
    if (!result.ok) {
      sendError(res, 400, "VALIDATION_ERROR", "The survey is not valid.", { fields: result.fields });
      return;
    }
    const { title, description, questions } = result.value;
    const updated = await prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { surveyId: id } });
      return tx.survey.update({
        where: { id },
        data: {
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
    });
    res.json({ data: surveyDetail(updated) });
  } catch (err) {
    next(err);
  }
});

// F-09: delete a DRAFT survey.
surveysRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      surveyNotFound(res);
      return;
    }
    const ownerId = req.user!.id;
    const survey = await prisma.survey.findFirst({ where: { id, ownerId }, select: { status: true } });
    if (!survey) {
      surveyNotFound(res);
      return;
    }
    if (survey.status !== "DRAFT") {
      sendError(res, 409, "NOT_A_DRAFT", "Only a draft survey can be deleted.");
      return;
    }
    await prisma.survey.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// F-04: DRAFT -> PUBLISHED (BR-02), only with at least one question (BR-03). One conditional
// update, so two simultaneous requests cannot both publish; when it updates nothing, the
// survey is read again to give the precise reason.
surveysRouter.post("/:id/publish", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      surveyNotFound(res);
      return;
    }
    const ownerId = req.user!.id;
    const now = new Date();
    const { count } = await prisma.survey.updateMany({
      where: { id, ownerId, status: "DRAFT", questions: { some: {} } },
      data: { status: "PUBLISHED", publishedAt: now },
    });
    if (count === 1) {
      res.json({ data: { id, status: "PUBLISHED", publishedAt: now } });
      return;
    }

    const survey = await prisma.survey.findFirst({ where: { id, ownerId }, select: { status: true } });
    if (!survey) {
      surveyNotFound(res);
    } else if (survey.status !== "DRAFT") {
      sendError(res, 409, "INVALID_TRANSITION", "Only a draft survey can be published.", { currentStatus: survey.status });
    } else {
      sendError(res, 409, "SURVEY_HAS_NO_QUESTIONS", "Add at least one question before publishing.");
    }
  } catch (err) {
    next(err);
  }
});

// F-10: PUBLISHED -> CLOSED (BR-02). Same conditional-update pattern as F-04 above.
surveysRouter.post("/:id/close", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      surveyNotFound(res);
      return;
    }
    const ownerId = req.user!.id;
    const now = new Date();
    const { count } = await prisma.survey.updateMany({
      where: { id, ownerId, status: "PUBLISHED" },
      data: { status: "CLOSED", closedAt: now },
    });
    if (count === 1) {
      res.json({ data: { id, status: "CLOSED", closedAt: now } });
      return;
    }

    const survey = await prisma.survey.findFirst({ where: { id, ownerId }, select: { status: true } });
    if (!survey) {
      surveyNotFound(res);
    } else {
      sendError(res, 409, "INVALID_TRANSITION", "Only a published survey can be closed.", { currentStatus: survey.status });
    }
  } catch (err) {
    next(err);
  }
});

// F-14: individual responses for the survey owner, with optional CSV export.
surveysRouter.get("/:id/responses", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const survey = id === null ? null : await prisma.survey.findFirst({
      where: { id, ownerId: req.user!.id },
      include: {
        questions: { orderBy: { position: "asc" }, select: { id: true, position: true, text: true, type: true } },
      },
    });
    if (!survey) {
      surveyNotFound(res);
      return;
    }

    const responses = await prisma.response.findMany({
      where: { surveyId: survey.id },
      orderBy: { submittedAt: "desc" },
      include: {
        respondent: { select: { id: true, name: true, email: true } },
        answers: {
          orderBy: { question: { position: "asc" } },
          select: { questionId: true, ratingValue: true, optionId: true, textValue: true, option: { select: { label: true } } },
        },
      },
    });

    const format = req.query.format;
    if (format === "csv") {
      const questions = survey.questions;
      const header = ["Respondent", "Email", "Submitted at", ...questions.map((q) => q.text)];
      const rows = responses.map((r) => {
        const answerMap = new Map(r.answers.map((a) => [a.questionId, a]));
        return [
          r.respondent.name,
          r.respondent.email,
          r.submittedAt.toISOString(),
          ...questions.map((q) => {
            const a = answerMap.get(q.id);
            if (!a) return "";
            if (q.type === "RATING") return String(a.ratingValue ?? "");
            if (q.type === "CHOICE") return a.option?.label ?? "";
            return a.textValue ?? "";
          }),
        ];
      });
      const csvLines = [header, ...rows].map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="survey-${survey.id}-responses.csv"`);
      res.send(csvLines.join("\n") + "\n");
      return;
    }

    res.json({
      data: {
        surveyId: survey.id,
        title: survey.title,
        questions: survey.questions,
        responses: responses.map((r) => ({
          id: r.id,
          respondentName: r.respondent.name,
          respondentEmail: r.respondent.email,
          submittedAt: r.submittedAt,
          answers: r.answers.map((a) =>
            a.ratingValue !== null
              ? { questionId: a.questionId, ratingValue: a.ratingValue }
              : a.optionId !== null
                ? { questionId: a.questionId, optionId: a.optionId, optionLabel: a.option?.label }
                : { questionId: a.questionId, textValue: a.textValue },
          ),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// F-07: the owner's aggregate summary, in any status. Three aggregate queries (response
// count, rating counts by question and value, option counts), not one per question or per
// response (contract section 1).
surveysRouter.get("/:id/summary", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const survey = id === null ? null : await prisma.survey.findFirst({ where: { id, ownerId: req.user!.id }, include: SURVEY_DETAIL });
    if (!survey) {
      surveyNotFound(res);
      return;
    }
    const questionIds = survey.questions.map((q) => q.id);
    const [responseCount, ratingRows, optionRows] = await Promise.all([
      prisma.response.count({ where: { surveyId: survey.id } }),
      prisma.answer.groupBy({
        by: ["questionId", "ratingValue"],
        where: { questionId: { in: questionIds }, ratingValue: { not: null } },
        _count: { _all: true },
      }),
      prisma.answer.groupBy({
        by: ["optionId"],
        where: { questionId: { in: questionIds }, optionId: { not: null } },
        _count: { _all: true },
      }),
    ]);
    res.json({
      data: {
        surveyId: survey.id,
        title: survey.title,
        status: survey.status,
        responseCount,
        questions: computeSummary({
          questions: survey.questions,
          responseCount,
          ratingCounts: ratingRows.map((r) => ({ questionId: r.questionId, value: r.ratingValue!, count: r._count._all })),
          optionCounts: optionRows.map((r) => ({ optionId: r.optionId!, count: r._count._all })),
        }),
      },
    });
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
