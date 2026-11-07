import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
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

// F-02: each route declares the role it needs; it always runs after requireAuth, so a
// missing session is a 401 and only a wrong role is a 403.
export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      sendError(res, 403, "FORBIDDEN", "You do not have access to this action.");
      return;
    }
    next();
  };
}
