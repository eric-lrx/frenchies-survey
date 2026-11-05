# Sprint 1 Software Test Specification: coverage and results

Each contract in this folder gives the full test rows: input or precondition, action, expected result.
This page maps every Sprint 1 acceptance criterion to its tests and planned files, and will hold the
results of the release run.

## 1. Test levels and tools

| Level | Tool | Runs against | Purpose |
|---|---|---|---|
| Unit | Vitest | Pure functions | Validation and calculation rules |
| API and DB | Vitest, Supertest | The real Express app and the `cafe_feedback_test` database | Persistence, permissions, business rules, concurrency |
| UI component | Vitest, Testing Library | Components with the API mocked | Messages, disabled buttons, empty states |
| End to end | Playwright | The running application with the seeded development database | Critical journeys in a browser |
| Manual | A person following written steps | A fresh clone | Setup reproducibility (TEST-F08-01 only) |

No test mocks the database for a persistence or permission claim. Commands: `npm test` (unit, API and UI
component) and `npm run e2e` (end to end).

## 2. Coverage

| AC | Tests | Planned file | Result |
|---|---|---|---|
| AC-F08-01 | TEST-F08-01 (manual), TEST-F08-03 | README procedure; `server/tests/foundations.api.test.ts` | Not run |
| AC-F08-02 | TEST-F08-02 | `server/tests/seed.db.test.ts` | Not run |
| AC-F01-01 | TEST-F01-01 | `server/tests/auth.api.test.ts` | Not run |
| AC-F01-02 | TEST-F01-02, TEST-F01-07, UI-01 | `server/tests/auth.api.test.ts`; `client/tests/Login.test.tsx` | Not run |
| AC-F01-03 | TEST-F01-03, TEST-F01-08 | `server/tests/auth.api.test.ts` | Not run |
| AC-F01-04 | TEST-F01-04, E2E-03 | `server/tests/auth.api.test.ts`; `e2e/sprint-1.spec.ts` | Not run |
| AC-F01-05 | TEST-F01-05 | `server/tests/auth.api.test.ts` | Not run |
| AC-F01-06 | TEST-F01-06 | `server/tests/seed.db.test.ts` | Not run |
| AC-F02-01 | TEST-F02-01, TEST-F02-06, E2E-03 | `server/tests/access.api.test.ts`; `e2e/sprint-1.spec.ts` | Not run |
| AC-F02-02 | TEST-F02-02 | `server/tests/access.api.test.ts` | Not run |
| AC-F02-03 | TEST-F02-03, TEST-F02-05 | `server/tests/access.api.test.ts` | Not run |
| AC-F02-04 | TEST-F02-04 | `server/tests/access.api.test.ts` | Not run |
| AC-F03-01 | TEST-F03-01, E2E-01 | `server/tests/surveys.api.test.ts`; `e2e/sprint-1.spec.ts` | Not run |
| AC-F03-02 | TEST-F03-02, UNIT-01, UI-02 | `server/tests/surveys.api.test.ts`; `server/tests/unit/survey-rules.unit.test.ts`; `client/tests/CreateSurvey.test.tsx` | Not run |
| AC-F03-03 | TEST-F03-03 | `server/tests/surveys.api.test.ts` | Not run |
| AC-F04-01 | TEST-F04-01, E2E-01 | `server/tests/surveys.api.test.ts`; `e2e/sprint-1.spec.ts` | Not run |
| AC-F04-02 | TEST-F04-02, TEST-F04-03 | `server/tests/surveys.api.test.ts` | Not run |
| AC-F05-01 | TEST-F05-01, E2E-01 | `server/tests/open-surveys.api.test.ts`; `e2e/sprint-1.spec.ts` | Not run |
| AC-F05-02 | TEST-F05-02 | `server/tests/open-surveys.api.test.ts` | Not run |
| AC-F06-01 | TEST-F06-01, E2E-01 | `server/tests/responses.api.test.ts`; `e2e/sprint-1.spec.ts` | Not run |
| AC-F06-02 | TEST-F06-02, UI-03, E2E-02 | `server/tests/responses.api.test.ts`; `client/tests/FillSurvey.test.tsx`; `e2e/sprint-1.spec.ts` | Not run |
| AC-F06-03 | TEST-F06-03 | `server/tests/responses.api.test.ts` | Not run |
| AC-F06-04 | TEST-F06-04 | `server/tests/responses.api.test.ts` | Not run |
| AC-F06-05 | TEST-F06-05, UNIT-02 | `server/tests/responses.api.test.ts`; `server/tests/unit/survey-rules.unit.test.ts` | Not run |
| AC-F06-06 | TEST-F06-06 | `server/tests/responses.api.test.ts` | Not run |
| AC-F06-07 | TEST-F06-07 | `server/tests/responses.api.test.ts` | Not run |
| AC-F07-01 | TEST-F07-01, UNIT-03, E2E-01 | `server/tests/summary.api.test.ts`; `server/tests/unit/survey-rules.unit.test.ts`; `e2e/sprint-1.spec.ts` | Not run |
| AC-F07-02 | TEST-F07-02, UNIT-03, UI-04 | `server/tests/summary.api.test.ts`; `server/tests/unit/survey-rules.unit.test.ts`; `client/tests/Summary.test.tsx` | Not run |
| AC-F07-03 | TEST-F07-03 | `server/tests/summary.api.test.ts` | Not run |

TEST-F02-01 to TEST-F02-05 are extended by F-03 to F-07 as their routes appear (F-02 contract v1.1, section 6).

29 acceptance criteria and 45 planned tests: 34 API and DB, 3 unit, 4 UI component, 3 end to end and 1
manual. Every criterion has at least one automated test, except AC-F08-01, which also has a manual check
because it is about following the README by hand.

## 3. TDD evidence plan

For the rule work in F-01, F-02, F-03, F-04, F-06 and F-07, the tests are committed before the
implementation on each feature branch (`test:` commit, then `feat:` commit). The failing run before the
implementation and the passing run after it are kept with their commit ids for Part F of the deliverable.

## 4. Release run

To fill in on the release commit: the commit id, the date, each command, and the passed, failed and
skipped counts. Failed or skipped tests are reported here, never hidden.

| Command | Commit | Passed | Failed | Skipped |
|---|---|---|---|---|
| `npm test` | | | | |
| `npm run e2e` | | | | |
| TEST-F08-01 (manual) | | | | |
