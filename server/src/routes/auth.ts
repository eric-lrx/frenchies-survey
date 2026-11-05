import { Router } from "express";
import { prisma } from "../prisma.js";
import { sendError } from "../http.js";
import { UNKNOWN_USER_HASH, verifyPassword } from "../auth/password.js";
import { endSession, startSession } from "../auth/sessions.js";
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

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await endSession(res, req.sessionToken!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
