# F-02 Role-based access and ownership

| | |
|---|---|
| Requirements | BR-01, BR-10, NFR-02 |
| Depends on | F-01 |
| Version | 1.1, 2026-11-05 (see section 7) |

## 1. Behaviour

The server decides on every call who may do what. Two checks run in this order:

1. **Role.** Each route declares the role it needs. A signed-in user with another role gets 403
   `FORBIDDEN`. The role is read from the database through the session, never from the request.
2. **Ownership.** A Survey Owner reaches a survey only through a query filtered by `ownerId = session user`.
   A Respondent reaches a response only through a query filtered by `respondentId = session user`. When
   the filter finds nothing, the answer is 404 `NOT_FOUND`, exactly the same as for an id that does not
   exist. That way nobody can learn that someone else's survey exists.

A path id that is not a positive integer (for example `/api/surveys/abc`) is answered with 404.

Requests that carry a body must use `Content-Type: application/json`, otherwise they get 415
`UNSUPPORTED_MEDIA_TYPE`. Together with the `SameSite=Lax` cookie this blocks cross-site form posts.

## 2. Permission matrix (routes)

| Route | Respondent | Survey Owner |
|---|---|---|
| `GET /api/surveys`, `POST /api/surveys` | 403 | allowed |
| `GET /api/surveys/:id`, `POST .../publish`, `GET .../summary` | 403 | own survey only, otherwise 404 |
| `GET /api/open-surveys`, `GET /api/open-surveys/:id` | allowed | 403 |
| `POST /api/open-surveys/:id/responses` | allowed | 403 |
| `GET /api/responses/:id` | own response only, otherwise 404 | 403 |

## 3. UI

- The navigation shows only the links of the signed-in role. A Survey Owner sees "My surveys" and "New
  survey"; a Respondent sees "Open surveys".
- A route of the other role, typed in the address bar, redirects to the user's own home screen. Unknown
  routes do the same. This is convenience, not security: the API refuses the call anyway.

## 4. Data

No schema change. The ownership columns (`Survey.ownerId`, `Response.respondentId`) are added by F-03 and
F-06.

## 5. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F02-01 | A Respondent calling any Survey Owner route gets 403 `FORBIDDEN`, and nothing is created or changed. |
| AC-F02-02 | A Survey Owner calling any Respondent route (listing open surveys, opening one, submitting, reading a response) gets 403 `FORBIDDEN`, and no response is stored. |
| AC-F02-03 | Owner B reading, publishing or summarising owner A's survey gets 404 `NOT_FOUND`; the body contains no survey data and the survey is unchanged. |
| AC-F02-04 | Respondent B reading respondent A's response gets 404 `NOT_FOUND`, and the body contains no answer. |

## 6. Tests

F-02 builds the checks (`requireRole`, the ownership-filtered queries, the id parsing, the 415 guard and
the role navigation) before the routes they protect exist. TEST-F02-01 to TEST-F02-05 therefore grow with
the features: each one adds its routes to them in the same pull request.

| Test | Grows with |
|---|---|
| TEST-F02-01 (respondent on owner routes) | F-03 (list, create, detail), F-04 (publish), F-07 (summary) |
| TEST-F02-02 (owner on respondent routes) | F-05 (open surveys), F-06 (submit, read a response) |
| TEST-F02-03 (another owner's survey) | F-03 (detail), F-04 (publish), F-07 (summary) |
| TEST-F02-04 (another respondent's response) | F-06 |
| TEST-F02-05 (invalid and unknown ids) | F-03 |

In F-02 itself the mechanism is tested directly on a small test router (role check, 401 before 403, the
role taken from the database), together with TEST-F02-06 and E2E-03.

| Test | AC | Level | Precondition or input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-F02-01 | AC-F02-01 | API | Signed-in respondent; a seeded survey id | Call `GET` and `POST /api/surveys`, `GET /api/surveys/:id`, `POST .../publish`, `GET .../summary` | Each 403 `FORBIDDEN`; survey count and status unchanged |
| TEST-F02-02 | AC-F02-02 | API | Signed-in owner; a PUBLISHED survey | Call the four Respondent routes | Each 403 `FORBIDDEN`; response count unchanged |
| TEST-F02-03 | AC-F02-03 | API | Survey of owner A in DRAFT; owner B signed in | Owner B calls detail, publish and summary of that survey | Each 404; no `title` in the body; the survey is still DRAFT |
| TEST-F02-04 | AC-F02-04 | API | A response by respondent A; respondent B signed in | Respondent B calls `GET /api/responses/:id` | 404; no `answers` in the body |
| TEST-F02-05 | AC-F02-03 | API (boundary) | Signed-in owner | `GET /api/surveys/abc` and `GET /api/surveys/999999` | Both 404 with the same body |
| TEST-F02-06 | AC-F02-01 | API (boundary) | Signed-in owner | `POST /api/surveys` with `Content-Type: text/plain` | 415 `UNSUPPORTED_MEDIA_TYPE`; nothing stored |
| E2E-03 | AC-F02-01, AC-F01-04 | End to end | Seeded respondent | Sign in, open `/owner/surveys` by URL, sign out, press Back | Redirected to "Open surveys"; after sign-out the login screen stays |

## 7. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-11-05 | First version | Written before implementation |
| 1.1 | 2026-11-05 | Test allocation: TEST-F02-01 to 05 grow with F-03 to F-07; the mechanism is tested on a test router in F-02 | Found when starting F-02: its route tests need routes that F-03 to F-06 create, while F-02 must come first |
