import { Router } from "express";
import { prisma } from "../prisma.js";
import { parseId, sendError } from "../http.js";
import { requireAuth, requireRole } from "../auth/middleware.js";

// F-06: a respondent re-reads their own response. The query is filtered by respondent, so
// another respondent's response is "not found" (F-02). There is deliberately no route that
// changes or deletes a response (BR-09).
export const responsesRouter = Router();
responsesRouter.use(requireAuth, requireRole("RESPONDENT"));

// F-11: a respondent lists the surveys they already answered and re-reads their responses.
responsesRouter.get("/", async (req, res, next) => {
  try {
    const responses = await prisma.response.findMany({
      where: { respondentId: req.user!.id },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        surveyId: true,
        submittedAt: true,
        survey: { select: { title: true, status: true } },
      },
    });
    res.json({
      data: responses.map((r) => ({
        id: r.id,
        surveyId: r.surveyId,
        surveyTitle: r.survey.title,
        surveyStatus: r.survey.status,
        submittedAt: r.submittedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

responsesRouter.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const response =
      id === null
        ? null
        : await prisma.response.findFirst({
            where: { id, respondentId: req.user!.id },
            select: {
              id: true,
              surveyId: true,
              submittedAt: true,
              survey: { select: { title: true } },
              answers: {
                orderBy: { question: { position: "asc" } },
                select: {
                  questionId: true,
                  ratingValue: true,
                  optionId: true,
                  question: { select: { text: true, type: true } },
                  option: { select: { label: true } },
                },
              },
            },
          });
    if (!response) {
      sendError(res, 404, "NOT_FOUND", "Response not found.");
      return;
    }
    res.json({
      data: {
        id: response.id,
        surveyId: response.surveyId,
        surveyTitle: response.survey.title,
        submittedAt: response.submittedAt,
        answers: response.answers.map((a) =>
          a.question.type === "RATING"
            ? { questionId: a.questionId, questionText: a.question.text, type: "RATING", ratingValue: a.ratingValue }
            : { questionId: a.questionId, questionText: a.question.text, type: "CHOICE", optionId: a.optionId, optionLabel: a.option?.label },
        ),
      },
    });
  } catch (err) {
    next(err);
  }
});
