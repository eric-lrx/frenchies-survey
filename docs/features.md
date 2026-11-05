# Feature inventory: Café Feedback

Version 0.1, 2026-11-05. Requirements are in `docs/srs.md`; the requirement-to-feature table is in
`docs/traceability.md`.

## 1. Features

| ID | Feature | Description | Requirements | Depends on | Sprint |
|---|---|---|---|---|---|
| F-01 | Authentication | Login, logout and current user with database-backed sessions | FR-01, FR-02, FR-03, BR-15, NFR-01, NFR-03 | F-08 | 1 |
| F-02 | Role-based access and ownership | Owner and Respondent permissions, ownership checks on every survey and response | BR-01, BR-10, NFR-02 | F-01 | 1 |
| F-03 | Create survey | An owner creates a DRAFT survey with rating and choice questions | FR-04, FR-05, BR-12 | F-02 | 1 |
| F-04 | Publish survey | An owner publishes a DRAFT survey | FR-07, BR-02, BR-03 | F-03 | 1 |
| F-05 | Browse open surveys | A respondent lists and opens PUBLISHED surveys | FR-08 | F-04 | 1 |
| F-06 | Submit response | Validated, once per respondent, only while PUBLISHED, with confirmation | FR-10, BR-05 to BR-09, NFR-04 | F-05 | 1 |
| F-07 | Aggregate summary | Response count, rating average and distribution, count per choice | FR-11, BR-11 | F-06 | 1 |
| F-08 | Project foundations | Repository, migrations, idempotent seed, test harness, README setup | NFR-05 | none | 1 |
| F-09 | Manage drafts | Edit or delete questions of a DRAFT survey | FR-06, BR-03, BR-04 | F-03 | 2 |
| F-10 | Close survey | An owner closes a PUBLISHED survey | FR-12, BR-02 | F-04 | 2 |
| F-11 | My responses | A respondent lists the surveys answered and re-reads their responses | FR-09 | F-06 | 2 |
| F-12 | Text questions | Short-text question type in creation, answering and results | FR-15 | F-06 | 2 |
| F-13 | Eligibility list | Restrict a survey to listed respondents | FR-13, BR-13 | F-06 | 2 |
| F-14 | Individual responses and export | Identified responses for the owner, CSV export | FR-14 | F-06 | 2 |
| F-15 | Performance and responsive UI | 300 ms summary target, layouts at 375, 768 and 1280 px | NFR-06, NFR-07 | F-07 | 2 |
| F-16 | Anonymous mode | Answers stored without a user link, separate receipt of who responded | FR-16, BR-14, NFR-09 | F-14 | 3 |
| F-17 | Analysis filters and trend | Date range filter, responses per day | FR-17 | F-07 | 3 |
| F-18 | Duplicate survey | Copy a closed survey into a new DRAFT | FR-18 | F-10 | 3 |
| F-19 | Hardening and delivery | Failure handling, accessibility, regression, deployment evidence | NFR-07, NFR-08 | all | 3 |

## 2. Planned acceptance criteria for Sprint 1

The criteria below are fixed before the contracts are written. The contracts in
`docs/sprints/sprint-1/` give each one its full behaviour, API shape and test, and may only refine them.
Each criterion has a test named `TEST-<same suffix>`. E2E journeys are listed at the end.

| Feature | Acceptance criteria |
|---|---|
| F-01 | AC-F01-01 valid login sets a session and returns the identity. AC-F01-02 wrong password and unknown email give the same 401. AC-F01-03 the current-user call returns name and role, never the hash. AC-F01-04 after logout the old session gets 401. AC-F01-05 every protected route without a session gets 401 and no private data. AC-F01-06 stored passwords are bcrypt hashes. |
| F-02 | AC-F02-01 a respondent calling an owner operation gets 403. AC-F02-02 an owner calling the submit operation gets 403. AC-F02-03 an owner reading, publishing or summarising another owner's survey gets 404 and no data. AC-F02-04 a respondent reading another respondent's response gets 404. |
| F-03 | AC-F03-01 a valid survey is stored as DRAFT, owned by the session user, questions in order. AC-F03-02 an invalid survey is rejected with field messages and nothing is stored. AC-F03-03 an owner lists and reads only their own surveys. |
| F-04 | AC-F04-01 an owner publishes a DRAFT survey and `publishedAt` is set. AC-F04-02 publishing a survey that is not DRAFT is rejected with 409 and the status is unchanged. |
| F-05 | AC-F05-01 a respondent lists only PUBLISHED surveys. AC-F05-02 a respondent opens a published survey and sees its questions and options but no owner-private data. A DRAFT survey is 404. |
| F-06 | AC-F06-01 a valid response is stored for the session user and can be read back. AC-F06-02 a second response by the same respondent gets 409 and exactly one is stored. AC-F06-03 a response to a DRAFT survey gets 404. AC-F06-04 a response to a CLOSED survey gets 409. AC-F06-05 invalid answers are rejected with 400 and nothing is stored. AC-F06-06 two simultaneous submissions store exactly one response. AC-F06-07 no route lets a respondent change or delete a submitted response. |
| F-07 | AC-F07-01 the summary equals the values computed directly from the database. AC-F07-02 a survey with no response gives count 0 and empty averages. AC-F07-03 the summary contains no respondent identity and no individual answer. |
| F-08 | AC-F08-01 the README commands install, migrate, seed, start and test from a clean clone. AC-F08-02 running the seed twice creates no duplicate. |

Planned E2E journeys: E2E-01 an owner creates and publishes a survey, a respondent answers it, the owner
reads the summary (AC-F03-01, AC-F04-01, AC-F05-01, AC-F06-01, AC-F07-01). E2E-02 a repeat submission is
refused with a clear message (AC-F06-02). E2E-03 a respondent cannot reach owner screens, and a logged-out
session cannot go back into the application (AC-F02-01, AC-F01-04).
