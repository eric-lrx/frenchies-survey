import type { Response } from "express";

// Every error leaves the API in one shape (docs/system-sds.md, section 4):
// { "error": { "code": "...", "message": "...", ...extra } }
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

// F-02: a path id must be a positive integer (and fit in a PostgreSQL integer); anything
// else is answered like an id that does not exist.
export function parseId(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const id = Number(raw);
  return id <= 2_147_483_647 ? id : null;
}

export function sendError(res: Response, status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  res.status(status).json({ error: { code, message, ...extra } });
}
