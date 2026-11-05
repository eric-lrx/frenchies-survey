# F-05 Browse open surveys

| | |
|---|---|
| Requirements | FR-08 (and BR-10 for what a respondent may see) |
| Depends on | F-04 |
| Version | 1.0, 2026-11-05 |

## 1. Behaviour

A Respondent sees the list of PUBLISHED surveys and opens one to answer it. DRAFT and CLOSED surveys do not
appear, and opening one by its id gives 404. A respondent sees only what is needed to answer: no owner id,
no response count, no other respondent's data.

The list also says, for each survey, whether this respondent has already answered it, so the UI can show
"Answered" instead of an "Answer" button. Re-reading one's own answers in a list is F-11 (Sprint 2).

## 2. API

**`GET /api/open-surveys`** (Respondent): PUBLISHED surveys, most recently published first.

```json
{ "data": [ { "id": 7, "title": "Spring menu feedback", "description": "...", "publishedAt": "...",
              "questionCount": 2, "alreadyResponded": false } ] }
```

**`GET /api/open-surveys/:id`** (Respondent)

| Result | Status | Body |
|---|---|---|
| PUBLISHED | 200 | `{"data":{"id":7,"title":"...","description":"...","alreadyResponded":false,"questions":[{"id":21,"position":1,"text":"...","type":"RATING","options":[]},{"id":22,"position":2,"text":"...","type":"CHOICE","options":[{"id":5,"position":1,"label":"Latte"}]}]}}` |
| DRAFT, CLOSED or missing | 404 | `{"error":{"code":"NOT_FOUND","message":"Survey not found."}}` |

Neither body contains `ownerId`, `responseCount`, `status` or any answer.

## 3. UI

- **Open surveys** (`/surveys`): one card per survey with title, description, number of questions, and
  either an "Answer" button or an "Answered" badge. Empty state: "No survey is open right now."
- **Fill survey** (`/surveys/:id`): defined in F-06. If the survey was already answered, the page says so
  and offers a link back to the list instead of the form. A 404 shows "This survey is not available."

## 4. Data

No schema change. `alreadyResponded` is computed from `Response` (F-06), with one query for the whole
list, not one per survey.

## 5. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F05-01 | `GET /api/open-surveys` returns every PUBLISHED survey and no DRAFT or CLOSED survey, with `alreadyResponded` correct for the signed-in respondent. |
| AC-F05-02 | `GET /api/open-surveys/:id` on a PUBLISHED survey returns its questions and options in order, without `ownerId`, `responseCount` or any answer; on a DRAFT or CLOSED survey it returns 404. |

## 6. Tests

| Test | AC | Level | Precondition or input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-F05-01 | AC-F05-01 | API | One DRAFT, two PUBLISHED and one CLOSED survey; the respondent has answered one PUBLISHED | `GET /api/open-surveys` | Exactly the two PUBLISHED surveys; `alreadyResponded` true for the answered one only |
| TEST-F05-02 | AC-F05-02 | API | Same data | Open a PUBLISHED, a DRAFT and a CLOSED survey | 200 with ordered questions and options and none of the forbidden keys; 404 for the DRAFT and the CLOSED |
| E2E-01 | AC-F05-01 | End to end | See F-07 | The respondent finds the new survey in the list | The survey is listed with an "Answer" button |

## 7. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-11-05 | First version | Written before implementation |
