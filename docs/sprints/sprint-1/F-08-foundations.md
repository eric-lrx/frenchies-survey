# F-08 Project foundations

| | |
|---|---|
| Requirements | NFR-05 (and design for NFR-08) |
| Depends on | nothing |
| Version | 1.1, 2026-11-05 (see section 6) |

## 1. Behaviour

A developer clones the repository and gets a running application and a passing test suite with the
commands in the README, without asking anyone. Everything later features need is set up here: the
repository layout, the database connection and migrations, the idempotent seed, the test harness, and two
probe endpoints that Lab 5 will use.

## 2. Design

**Layout.** One repository with npm workspaces:

```
client/   React + Vite + TypeScript, Testing Library tests in client/tests/
server/   Express + TypeScript + Prisma, Vitest + Supertest tests in server/tests/
e2e/      Playwright tests
docs/     engineering documents
```

The root `package.json` runs both sides: `npm run dev` starts API and UI together, `npm test` runs the
server and client tests, `npm run e2e` runs Playwright. In development the Vite server forwards `/api` to
the API, so the browser sees one origin and no CORS configuration is needed. In production one container
serves both (system SDS, section 8).

**Configuration.** `server/.env.example` lists every variable with a placeholder. On start the API stops
with a clear message if `DATABASE_URL` is missing. `SEED_PASSWORD` is read only by the seed.

**Databases.** Two local databases: `cafe_feedback` for development and `cafe_feedback_test` for the
automated tests, so tests never touch demo data. The test harness reads `TEST_DATABASE_URL`, applies
migrations, and empties all tables before each test file. As a safety check it refuses to run if the
database name does not end in `_test`.

**Seed (idempotent).** It upserts by natural key (email for users, owner and title for surveys), so a
second run changes nothing. The seed grows with the tables: F-01 adds the accounts, F-03 the surveys, F-06
the responses. The table below is the data set reached at the end of Sprint 1, and TEST-F08-02 runs again
each time the seed grows.

| Data | Content |
|---|---|
| Survey Owners | Camille Martin (`camille@cafe.test`, café manager), Lucas Bernard (`lucas@cafe.test`, second owner for ownership tests) |
| Respondents | Alice, Bruno and Chloé (`alice@customer.test`, `bruno@customer.test`, `chloe@customer.test`) |
| Surveys of Camille | "Spring menu feedback" (PUBLISHED, answered by Alice and Bruno), "Terrace opening" (DRAFT), "Winter drinks" (CLOSED, answered by Chloé) |
| Surveys of Lucas | "Barista service" (PUBLISHED, no responses) |

Every demo account gets the password from `SEED_PASSWORD`. It is never written in the repository.

**Probes.** `GET /api/health` returns `200 {"data":{"status":"ok"}}` without touching the database.
`GET /api/ready` returns `200` when the database answers a trivial query and `503
{"error":{"code":"NOT_READY",...}}` otherwise. Neither returns private data. Prisma generates no client
while the schema has no model, so `/api/ready` and the helper that empties the test database are added
with the first model, in F-01.

**Error handling.** A JSON 404 for unknown routes, a 400 `VALIDATION_ERROR` for a body that is not valid
JSON, and a last-resort handler that answers `500
{"error":{"code":"INTERNAL_ERROR","message":"Something went wrong."}}` without a stack trace.

## 3. UI, API and data

- UI: the application shell (header, role navigation, main area) and the routing setup. Screens arrive with
  their features.
- API: the two probes, the 404 and 500 handlers.
- Data: the first Prisma schema and migration are created by F-01, the first feature that needs a table.
  This feature adds no table.

## 4. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F08-01 | On a clean clone, the README commands install, configure, migrate, seed, start and test the application in at most 10 commands, and the tests pass. |
| AC-F08-02 | Running the seed twice leaves the same number of users, surveys, questions and responses as running it once. |

## 5. Tests

| Test | AC | Level | Precondition or input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-F08-01 | AC-F08-01 | Manual, recorded | Fresh clone in an empty folder, PostgreSQL running | Follow the README word for word | App opens, sign-in with a seeded account works, `npm test` passes; the command count is at most 10 |
| TEST-F08-02 | AC-F08-02 | Integration (DB) | Empty test database | Run the seed twice | Row counts after the second run equal the counts after the first |
| TEST-F08-03 | AC-F08-01 | API | Test database up | `GET /api/health` (F-08), `GET /api/ready` (added with F-01) | Both `200`; no private data in either body |

## 6. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-11-05 | First version | Written before implementation |
| 1.1 | 2026-11-05 | `/api/ready` and the test-database reset helper move to F-01; the seed grows feature by feature; a 400 for malformed JSON is named | Found while implementing: `prisma generate` refuses a schema with no model ("You don't have any models defined"), so no database query is possible before F-01's first table |
| 1.2 | 2026-11-05 | `server/package.json` runs `prisma generate` on `postinstall` | Found by TEST-F08-01 on a fresh clone: in an npm workspace, the `@prisma/client` install step looks for the schema at the repository root, not in `server/prisma`, so the client was never generated and `npm run db:seed` failed with "@prisma/client did not initialize yet" |
