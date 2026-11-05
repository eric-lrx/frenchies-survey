import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { HttpError, sendError } from "./http.js";
import { prisma } from "./prisma.js";
import { authRouter } from "./routes/auth.js";

// Builds the Express application without starting a server, so tests can call it
// through Supertest (F-08). Feature routes are registered here as they are built.
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ data: { status: "ok" } });
  });

  // Readiness: the database answers a trivial query (F-08 contract v1.1, added with F-01).
  app.get("/api/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ data: { status: "ready" } });
    } catch {
      sendError(res, 503, "NOT_READY", "The database is not reachable.");
    }
  });

  app.use("/api/auth", authRouter);

  app.use((_req, res) => {
    sendError(res, 404, "NOT_FOUND", "Not found.");
  });

  // Last-resort handler: a known HttpError keeps its status; a body-parser failure is a
  // client error; anything else is logged and answered without internal detail.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      sendError(res, err.status, err.code, err.message, err.extra);
      return;
    }
    const parserError = err as { type?: string; status?: number };
    if (parserError.type === "entity.parse.failed") {
      sendError(res, 400, "VALIDATION_ERROR", "The request body is not valid JSON.");
      return;
    }
    if (parserError.type === "entity.too.large") {
      sendError(res, 413, "PAYLOAD_TOO_LARGE", "The request body is too large.");
      return;
    }
    console.error(err);
    sendError(res, 500, "INTERNAL_ERROR", "Something went wrong.");
  });

  return app;
}
