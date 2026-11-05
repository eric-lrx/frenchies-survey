import { Router } from "express";
import { prisma } from "../prisma.js";
import { sendError } from "../http.js";
import { UNKNOWN_USER_HASH, verifyPassword } from "../auth/password.js";
import { SESSION_COOKIE, endSession, findSessionUser, startSession } from "../auth/sessions.js";
import { requireAuth } from "../auth/middleware.js";

// F-01 Authentication (docs/sprints/sprint-1/F-01-authentication.md, section 2).
export const authRouter = Router();

const INVALID_CREDENTIALS = "Email or password is incorrect.";

authRouter.post("/login", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    const fields: Record<string, string> = {};
    if (!email) fields.email = "Required";
    if (!password) fields.password = "Required";
    if (Object.keys(fields).length > 0) {
      sendError(res, 400, "VALIDATION_ERROR", "Email and password are required.", { fields });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Always run one bcrypt comparison, so an unknown email is not faster to reject.
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? UNKNOWN_USER_HASH);
    if (!user || !user.isActive || !passwordMatches) {
      sendError(res, 401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS);
      return;
    }

    await startSession(res, user.id);
    res.json({ data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ data: req.user });
});

// Page-load check (contract v1.1): always 200, so a visitor who is not signed in does not
// cause a failed request. It only ever describes the caller's own session.
authRouter.get("/session", async (req, res, next) => {
  try {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const user = typeof token === "string" && token ? await findSessionUser(token) : null;
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await endSession(res, req.sessionToken!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
