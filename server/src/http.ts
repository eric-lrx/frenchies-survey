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

export function sendError(res: Response, status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  res.status(status).json({ error: { code, message, ...extra } });
}
