import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { join } from "node:path";
import { HttpError, sendError } from "./http.js";
import { prisma } from "./prisma.js";
import { authRouter } from "./routes/auth.js";
import { surveysRouter } from "./routes/surveys.js";
import { openSurveysRouter } from "./routes/openSurveys.js";
import { responsesRouter } from "./routes/responses.js";

export interface AppOptions {
  // Folder of the built React app (client/dist). Set in the container only; in development
  // the Vite server serves the UI and forwards /api here (Lab 5, #23).
  staticDir?: string;
}

// Builds the Express application without starting a server, so tests can call it
// through Supertest (F-08). Feature routes are registered here as they are built.
export function createApp(options: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Cloud Run puts one proxy in front of the container; trust it for the client address
  // and the HTTPS scheme.
  app.set("trust proxy", 1);

  // F-02: a request that carries a body must send JSON. With the SameSite=Lax cookie this
  // blocks cross-site HTML form posts. Body-less requests (logout, publish) pass.
  app.use((req, res, next) => {
    const hasBody = req.headers["transfer-encoding"] !== undefined || Number(req.headers["content-length"] ?? 0) > 0;
    if (hasBody && !req.is("application/json")) {
      sendError(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Send the request body as JSON.");
      return;
    }
    next();
  });
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
  app.use("/api/surveys", surveysRouter);
  app.use("/api/open-surveys", openSurveysRouter);
  app.use("/api/responses", responsesRouter);

  if (options.staticDir) {
    const staticDir = options.staticDir;
    // Built assets have content hashes in their names, so they can be cached for long.
    app.use("/assets", express.static(join(staticDir, "assets"), { immutable: true, maxAge: "1y" }));
    // A missing asset is a 404, never the app shell (a stale page would load HTML as code).
    app.use("/assets", (_req, res) => {
      sendError(res, 404, "NOT_FOUND", "Not found.");
    });
    app.use(express.static(staticDir, { index: false }));
    // Any other GET outside /api is a client-side route: answer with the app shell.
    app.get(/^\/(?!api(\/|$)).*/, (_req, res) => {
      res.set("Cache-Control", "no-cache");
      res.sendFile(join(staticDir, "index.html"));
    });
  }

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
