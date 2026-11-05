// Route lists used by the access tests. Each feature adds its routes in the same pull
// request (F-02 contract v1.1, section 6). ":id" is replaced by a real id in the tests.
type Route = { method: "get" | "post"; path: string };

// Every protected route of the API: AC-F01-05 calls each one without a session.
export const PROTECTED_ROUTES: Route[] = [
  { method: "get", path: "/api/auth/me" },
  { method: "post", path: "/api/auth/logout" },
  { method: "get", path: "/api/surveys" },
  { method: "post", path: "/api/surveys" },
  { method: "get", path: "/api/surveys/1" },
  { method: "post", path: "/api/surveys/1/publish" },
  { method: "get", path: "/api/surveys/1/summary" },
  { method: "get", path: "/api/open-surveys" },
  { method: "get", path: "/api/open-surveys/1" },
  { method: "post", path: "/api/open-surveys/1/responses" },
  { method: "get", path: "/api/responses/1" },
];

// Survey Owner routes: a Respondent gets 403 on each (TEST-F02-01).
export const OWNER_ROUTES: Route[] = [
  { method: "get", path: "/api/surveys" },
  { method: "post", path: "/api/surveys" },
  { method: "get", path: "/api/surveys/:id" },
  { method: "post", path: "/api/surveys/:id/publish" },
  { method: "get", path: "/api/surveys/:id/summary" },
];

// Owner routes on one survey: another owner gets 404 and no data (TEST-F02-03).
export const OWNED_SURVEY_ROUTES: Route[] = [
  { method: "get", path: "/api/surveys/:id" },
  { method: "post", path: "/api/surveys/:id/publish" },
  { method: "get", path: "/api/surveys/:id/summary" },
];

// Respondent routes: a Survey Owner gets 403 on each (TEST-F02-02).
export const RESPONDENT_ROUTES: Route[] = [
  { method: "get", path: "/api/open-surveys" },
  { method: "get", path: "/api/open-surveys/:id" },
  { method: "post", path: "/api/open-surveys/:id/responses" },
  { method: "get", path: "/api/responses/:responseId" },
];
