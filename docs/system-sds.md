# System-Level Software Design Specification: Café Feedback

Version 0.2, 2026-11-05 (section 9). Requirements: `docs/srs.md`. Features: `docs/features.md`.
Feature-level designs are in `docs/sprints/sprint-N/`.

## 1. Architecture and stack

```
 Browser (React + Vite, TypeScript)
        |  HTTPS, JSON, session cookie
        v
 API (Node.js, Express, TypeScript)   <- business rules, validation, authorization
        |  Prisma
        v
 PostgreSQL 16                        <- constraints, migrations, durable data
```

| Layer | Choice | Responsibility |
|---|---|---|
| UI | React, Vite, React Router, Bootstrap | Screens, form validation for quick feedback, navigation by role. It never decides who may do what. |
| API | Express, TypeScript | Authentication, role and ownership checks, input validation, business rules, aggregate computation |
| Database | PostgreSQL 16 through Prisma | Durable data, uniqueness and check constraints, migrations |
| Tests | Vitest and Supertest (API, unit), Testing Library (UI), Playwright (end to end) | Real database for API tests; no mocked persistence |

The choice follows D-01: it is the stack used in the individual labs, and the Lab 5 starter kit targets it.
The product is a modular monolith. In production one container serves the API and the built UI, which
keeps deployment to one service.

**Where rules are enforced.** Business rules live in the API (a service layer with pure functions that
unit tests call directly). The database backs the ones that must hold under concurrency: the uniqueness of
`(surveyId, respondentId)` for BR-06, and check constraints on answer values. The UI repeats validation only
to give early messages.

## 2. Data model

| Entity | Fields | Constraints and indexes |
|---|---|---|
| User | id, name, email, passwordHash, role (`SURVEY_OWNER` or `RESPONDENT`), isActive, createdAt | `email` unique |
| Session | id, userId, tokenHash, expiresAt, createdAt | `tokenHash` unique; index on `userId`; row deleted at logout |
| Survey | id, ownerId, title, description, status (`DRAFT`, `PUBLISHED`, `CLOSED`), createdAt, publishedAt, closedAt | index on `ownerId`; index on `status` |
| Question | id, surveyId, position, text, type (`RATING`, `CHOICE`; `TEXT` in Sprint 2) | `(surveyId, position)` unique; deleted with its survey |
| QuestionOption | id, questionId, position, label | `(questionId, position)` and `(questionId, label)` unique |
| Response | id, surveyId, respondentId, submittedAt | `(surveyId, respondentId)` unique (BR-06); index on `surveyId` |
| Answer | id, responseId, questionId, ratingValue, optionId | `(responseId, questionId)` unique; `ratingValue` between 1 and 5 when set; exactly one of `ratingValue`, `optionId` is set; index on `questionId` |

Ownership links: `Survey.ownerId` (BR-01) and `Response.respondentId` (BR-10). A response belongs to one
survey, and each answer must point to a question of that same survey, which the API checks (BR-08).

Later sprints add `Survey.mode`, an eligibility table and a text value (Sprint 2), and for anonymous mode a
separate receipt table that records who responded while `Response` carries no user link (Sprint 3,
BR-14). The Sprint 3 contract will describe that migration before it is written.

**Database setup.** Prisma migrations are applied with `prisma migrate deploy` and never edited after they
are merged. The seed script is idempotent: it upserts by natural keys, so running it twice creates nothing
new. Demo data: one owner and a second owner (to test ownership), three respondents, and three surveys
(one DRAFT, one PUBLISHED with several responses, one CLOSED). The password of the demo accounts comes from
the `SEED_PASSWORD` environment variable and is never written in the repository or shown in a screenshot.

## 3. UI conventions

Main screens: Login; for a Survey Owner, My surveys, Create survey, Survey detail (with publish) and
Summary; for a Respondent, Open surveys, Fill survey and Confirmation. Navigation shows only the links of
the signed-in role. A route the role may not use redirects to that role's home screen.

Shared behaviour on every screen: a visible loading state, an empty state with a clear message, an error
state that offers a retry, field-level validation messages next to the field, disabled submit buttons while
a request is in flight (this prevents double submission), and a label on every form control. Layouts must
work at 375, 768 and 1280 px without horizontal scrolling (NFR-07).

## 4. API conventions

| Topic | Convention |
|---|---|
| Base path and format | `/api/...`, JSON in and out |
| Success | `{ "data": ... }` with 200, or 201 for a created resource |
| Error | `{ "error": { "code": "SURVEY_NOT_OPEN", "message": "...", "fields": { ... } } }`. No stack trace and no internal detail. |
| 400 | Validation failure, with the field and the reason |
| 401 | No valid session |
| 403 | Valid session, wrong role |
| 404 | Resource does not exist, or belongs to someone else (the response is identical, so existence does not leak) |
| 409 | The request conflicts with the state: duplicate response, survey not open, invalid transition |
| Mutations | Accept only `application/json` bodies (otherwise 415), which with a `SameSite=Lax` cookie blocks cross-site form posts |

Feature contracts give each endpoint's exact request, response and errors.

## 5. Roles and permissions

| Operation | Visitor | Respondent | Survey Owner |
|---|---|---|---|
| Log in | yes | yes | yes |
| Read own identity, log out | no | yes | yes |
| Create a survey | no | no | yes |
| Read, publish or summarise a survey | no | no | own surveys only |
| List open surveys, open one | no | yes (PUBLISHED only) | no |
| Submit a response | no | yes, once per survey | no |
| Read a response | no | own responses only | no (aggregates only in Sprint 1) |
| Change or delete a submitted response | no | no | no |

The check is made on the server on every call. Hiding a button is not authorization.

## 6. Authentication and sessions

- **Passwords.** Hashed with bcrypt (cost 12), never stored or logged in plaintext (BR-15, NFR-03). Accounts
  are seeded, so there is no sign-up or password reset.
- **Login.** A correct email and password create a random 32-byte token. The database keeps only its SHA-256
  hash with an expiry 8 hours ahead. The token goes to the browser in an `HttpOnly`, `SameSite=Lax` cookie,
  with `Secure` turned on in production.
- **Current user.** Each request looks up the hash, checks the expiry, and loads the user. The role comes
  from the database, never from the client.
- **Logout.** The session row is deleted and the cookie cleared, so a copy of the old cookie gets 401 (D-04).
  Because the session lives in the database, this holds across several instances and after a restart.
- **Failure messages.** A wrong password and an unknown email give the same response (FR-01).

## 7. Configuration and secrets

| Variable | Purpose | Secret |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | yes |
| `SEED_PASSWORD` | Password given to the demo accounts by the seed | yes |
| `PORT` | API port, default 3000 | no |
| `NODE_ENV` | `development`, `test` or `production` (turns on `Secure` cookies) | no |
| `TEST_DATABASE_URL` | Connection string of the separate test database, used only by the automated tests | yes |

`.env` is ignored by Git and only `.env.example`, with placeholders, is committed. The code reads every
setting from the environment (NFR-08). No CORS setting is needed: in development the Vite server forwards
`/api` to the API, and in production one container serves both, so the browser always sees one origin.

## 8. Delivery and deployment plan

Docker and the pipeline are built in Lab 5; Sprint 1 only keeps the design compatible.

- **Package.** A multi-stage Dockerfile builds the UI and the API into one image that serves both. Migrations
  run as a separate step before the service starts.
- **GCP.** Artifact Registry for images, Cloud Run for the service (minimum 0 instances, maximum 3 or fewer),
  Cloud SQL for PostgreSQL for durable data, Secret Manager for `DATABASE_URL` and `SEED_PASSWORD`.
- **Pipeline.** GitHub Actions runs the build and tests on every pull request, `main` is protected by the
  required check, and a merge to `main` deploys. GitHub signs in to GCP with Workload Identity Federation,
  so no service-account key is stored.
- **Persistence.** Everything the application needs lives in the database: users, sessions and responses.
  The container stores nothing.

The final choices, names and commands will be recorded in `docs/labs/lab-05/deployment.md`.

## 9. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-11-05 | First baseline | Project Deliverable 1 |
| 0.2 | 2026-11-05 | `CLIENT_ORIGIN` removed and `TEST_DATABASE_URL` added in section 7; 415 named in section 4 | The Sprint 1 contracts (F-08, F-02) chose a same-origin setup and a separate test database |
