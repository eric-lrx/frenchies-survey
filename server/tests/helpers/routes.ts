// Every protected route of the API (docs/sprints/sprint-1/README.md, API overview).
// AC-F01-05 calls each one without a session. Each feature adds its routes here.
export const PROTECTED_ROUTES: { method: "get" | "post"; path: string }[] = [
  { method: "get", path: "/api/auth/me" },
  { method: "post", path: "/api/auth/logout" },
];
