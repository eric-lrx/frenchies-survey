# Sprint 1 engineering contracts

Sprint 1 ends on 8 November 2026 (Project Deliverable 1). Its scope is defined in `docs/sprints/plan.md`:
an owner creates and publishes a survey, a respondent answers it once, the owner reads the aggregate
summary, with real authentication, role and ownership checks, and tests.

Each contract below was written and committed before the code of its feature. A contract may change
during the sprint, but every change is added to its revision table with the reason.

## Contracts

| Feature | Contract | Acceptance criteria |
|---|---|---|
| F-08 Project foundations | `F-08-foundations.md` | AC-F08-01, AC-F08-02 |
| F-01 Authentication | `F-01-authentication.md` | AC-F01-01 to AC-F01-06 |
| F-02 Role-based access and ownership | `F-02-access-control.md` | AC-F02-01 to AC-F02-04 |
| F-03 Create survey | `F-03-create-survey.md` | AC-F03-01 to AC-F03-03 |
| F-04 Publish survey | `F-04-publish-survey.md` | AC-F04-01, AC-F04-02 |
| F-05 Browse open surveys | `F-05-browse-open-surveys.md` | AC-F05-01, AC-F05-02 |
| F-06 Submit response | `F-06-submit-response.md` | AC-F06-01 to AC-F06-07 |
| F-07 Aggregate summary | `F-07-aggregate-summary.md` | AC-F07-01 to AC-F07-03 |

`sts.md` maps every criterion to its tests and will hold the results. `definition-of-done.md` is the
checklist the release must pass.

## API overview

| Method | Path | Who | Feature |
|---|---|---|---|
| GET | `/api/health` | anyone | F-08 |
| GET | `/api/ready` | anyone | F-08 |
| POST | `/api/auth/login` | anyone | F-01 |
| POST | `/api/auth/logout` | signed in | F-01 |
| GET | `/api/auth/me` | signed in | F-01 |
| GET | `/api/auth/session` | anyone (describes the caller's own session) | F-01 |
| GET | `/api/surveys` | Survey Owner | F-03 |
| POST | `/api/surveys` | Survey Owner | F-03 |
| GET | `/api/surveys/:id` | Survey Owner, own survey | F-03 |
| POST | `/api/surveys/:id/publish` | Survey Owner, own survey | F-04 |
| GET | `/api/surveys/:id/summary` | Survey Owner, own survey | F-07 |
| GET | `/api/open-surveys` | Respondent | F-05 |
| GET | `/api/open-surveys/:id` | Respondent | F-05 |
| POST | `/api/open-surveys/:id/responses` | Respondent | F-06 |
| GET | `/api/responses/:id` | Respondent, own response | F-06 |

Error codes used in every contract:

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input breaks a validation rule; `fields` names each problem |
| 401 | `INVALID_CREDENTIALS` | Login failed (same message for every cause) |
| 401 | `UNAUTHENTICATED` | No valid session on a protected route |
| 403 | `FORBIDDEN` | Valid session, wrong role |
| 404 | `NOT_FOUND` | Missing, or owned by someone else, or not visible to this role |
| 409 | `INVALID_TRANSITION` | Survey status does not allow the change |
| 409 | `SURVEY_HAS_NO_QUESTIONS` | Publishing a survey without questions |
| 409 | `SURVEY_NOT_OPEN` | Answering a CLOSED survey |
| 409 | `DUPLICATE_RESPONSE` | The respondent already answered this survey |
| 413 | `PAYLOAD_TOO_LARGE` | A JSON body over 100 kB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | A request with a body that is not `application/json` |
| 500 | `INTERNAL_ERROR` | An unexpected server error; the details are logged, never returned |
| 503 | `NOT_READY` | `GET /api/ready` when the database does not answer |

## Implementation order and Issues

One Issue and one feature branch from `staging` per feature, in this order, because each needs the
previous one: F-08, F-01, F-02, F-03, F-04, F-05, F-06, F-07. Each pull request into `staging` is reviewed
by the other team member. When all eight are merged and the integration checks pass, a reviewed release
pull request goes from `staging` to `main` and is tagged `v0.1.0`.

## Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-11-05 | First version of the Sprint 1 contracts | Written before implementation |
