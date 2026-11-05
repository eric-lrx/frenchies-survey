import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE, findSessionUser, type SessionUser } from "./sessions.js";
import { sendError } from "../http.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
      sessionToken?: string;
    }
  }
}

// Every protected route starts with this (AC-F01-05). The identity and the role come
// from the database through the session, never from the request body or headers.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const user = typeof token === "string" && token ? await findSessionUser(token) : null;
    if (!user) {
      sendError(res, 401, "UNAUTHENTICATED", "Please sign in.");
      return;
    }
    req.user = user;
    req.sessionToken = token as string;
    next();
  } catch (err) {
    next(err);
  }
}
