// Thin wrapper over fetch for the Café Feedback API. Same origin (the Vite proxy in
// development, one container in production), so the session cookie travels on its own.

export type Role = "SURVEY_OWNER" | "RESPONDENT";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

// Called on any 401 except the login itself, so an expired session sends the user back to
// the login screen from wherever they are (F-01 contract, section 3).
let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Unable to reach the server. Please try again.");
  }

  if (res.status === 204) return undefined as T;
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const error = payload?.error ?? {};
    if (res.status === 401 && path !== "/api/auth/login") onUnauthorized();
    throw new ApiError(res.status, error.code ?? "UNKNOWN_ERROR", error.message ?? "Something went wrong.", error.fields ?? {});
  }
  return payload.data as T;
}

export type SurveyStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type QuestionType = "RATING" | "CHOICE";

export interface SurveyListItem {
  id: number;
  title: string;
  status: SurveyStatus;
  createdAt: string;
  publishedAt: string | null;
  questionCount: number;
}

export interface QuestionOption {
  id: number;
  position: number;
  label: string;
}

export interface Question {
  id: number;
  position: number;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
}

export interface SurveyDetail {
  id: number;
  title: string;
  description: string | null;
  status: SurveyStatus;
  ownerId: number;
  createdAt: string;
  publishedAt: string | null;
  questions: Question[];
}

export interface NewSurveyBody {
  title: string;
  description: string | null;
  questions: { text: string; type: QuestionType; options?: string[] }[];
}

export const api = {
  login: (email: string, password: string) => request<User>("POST", "/api/auth/login", { email, password }),
  logout: () => request<void>("POST", "/api/auth/logout"),
  me: () => request<User>("GET", "/api/auth/me"),
  session: () => request<User | null>("GET", "/api/auth/session"),
  listSurveys: () => request<SurveyListItem[]>("GET", "/api/surveys"),
  createSurvey: (body: NewSurveyBody) => request<SurveyDetail>("POST", "/api/surveys", body),
  getSurvey: (id: number) => request<SurveyDetail>("GET", `/api/surveys/${id}`),
  publishSurvey: (id: number) =>
    request<{ id: number; status: SurveyStatus; publishedAt: string }>("POST", `/api/surveys/${id}/publish`),
};

export const STATUS_LABELS: Record<SurveyStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CLOSED: "Closed",
};

// Dates are stored in UTC and shown in the café's time zone (D-08).
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function homePath(role: Role): string {
  return role === "SURVEY_OWNER" ? "/owner/surveys" : "/surveys";
}

export const ROLE_LABELS: Record<Role, string> = {
  SURVEY_OWNER: "Survey Owner",
  RESPONDENT: "Respondent",
};
