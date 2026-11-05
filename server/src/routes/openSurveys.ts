import { Router } from "express";
import { prisma } from "../prisma.js";
import { parseId } from "../http.js";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { surveyNotFound } from "./surveys.js";

// Respondent routes: F-05 (browse and open PUBLISHED surveys). A respondent sees only what
// is needed to answer: no owner, no status, no count, no answer (BR-10).
export const openSurveysRouter = Router();
openSurveysRouter.use(requireAuth, requireRole("RESPONDENT"));

openSurveysRouter.get("/", async (_req, res, next) => {
  try {
    const surveys = await prisma.survey.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      select: { id: true, title: true, description: true, publishedAt: true, _count: { select: { questions: true } } },
    });
    res.json({
      data: surveys.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        publishedAt: s.publishedAt,
        questionCount: s._count.questions,
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
    res.json({ data: survey });
  } catch (err) {
    next(err);
  }
});
