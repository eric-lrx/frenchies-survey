# F-03 Create survey

| | |
|---|---|
| Requirements | FR-04, FR-05, BR-12 (and BR-01 for ownership) |
| Depends on | F-02 |
| Version | 1.1, 2026-11-05 (see section 7) |

## 1. Behaviour

A Survey Owner creates a survey in one step: a title, an optional description, and one or more questions.
Each question is either a rating from 1 to 5 or a single choice among 2 to 6 options. The survey is saved as
DRAFT and belongs to the signed-in owner. The owner can list their own surveys and open one.

Sprint 1 has no editing of a saved draft (that is F-09 in Sprint 2), so the form must be complete when it
is saved.

**Validation rules** (applied by the API; the UI repeats them for early messages). Text is trimmed first.

| Field | Rule |
|---|---|
| `title` | required, 3 to 120 characters |
| `description` | optional, at most 500 characters |
| `questions` | 1 to 20 items |
| `questions[i].text` | required, 3 to 200 characters |
| `questions[i].type` | `RATING` or `CHOICE` |
| `questions[i].options` | `RATING`: must be absent or empty. `CHOICE`: 2 to 6 labels, each 1 to 60 characters, unique within the question ignoring case |

Any rule broken gives 400 with every problem listed in `fields`, and nothing is stored. The survey, its
questions and its options are created in one transaction, so a failure leaves no partial survey. Question
and option positions follow the order of the request, starting at 1.

## 2. API

**`POST /api/surveys`** (Survey Owner)

```json
{
  "title": "Spring menu feedback",
  "description": "Tell us what you think of the new spring menu.",
  "questions": [
    { "text": "How would you rate the new pastries?", "type": "RATING" },
    { "text": "Which drink did you order?", "type": "CHOICE", "options": ["Latte", "Iced tea", "Espresso"] }
  ]
}
```

| Result | Status | Body |
|---|---|---|
| Created | 201 | `{"data":{"id":7,"title":"...","description":"...","status":"DRAFT","ownerId":1,"createdAt":"...","publishedAt":null,"questions":[{"id":21,"position":1,"text":"...","type":"RATING","options":[]},{"id":22,"position":2,"text":"...","type":"CHOICE","options":[{"id":5,"position":1,"label":"Latte"}]}]}}` |
| Invalid | 400 | `{"error":{"code":"VALIDATION_ERROR","message":"The survey is not valid.","fields":{"title":"Must be 3 to 120 characters","questions[1].options":"A choice question needs 2 to 6 options"}}}` |

**`GET /api/surveys`** (Survey Owner): the owner's own surveys, newest first.
`200 {"data":[{"id","title","status","createdAt","publishedAt","questionCount","responseCount"}]}`
(`responseCount` is added by F-06, when responses exist.)

**`GET /api/surveys/:id`** (Survey Owner, own survey): the same shape as the 201 body, or 404.

## 3. UI

- **My surveys** (`/owner/surveys`): a table of title, status badge (text, not colour only), number of
  questions and creation date (the number of responses is added by F-06). Each title links to the detail page. Empty state: "You have no surveys yet"
  with a "New survey" button. Loading and error states as in the system SDS.
- **New survey** (`/owner/surveys/new`): title and description fields, a question list where each question
  has a text, a type selector and, for a choice question, an option list with "Add option" and "Remove"
  buttons. "Add question" and "Remove question" buttons. Messages appear next to the field they concern.
  "Save draft" is disabled while the request runs. On success the owner goes to the survey's detail page.
  On a 400 from the API the entered values stay in the form.
- **Survey detail** (`/owner/surveys/:id`): title, description, status, and the questions with their
  options, read-only.

## 4. Data

Migration `surveys`:
- `Survey`: id, ownerId (foreign key to User), title, description, status (enum `DRAFT`, `PUBLISHED`,
  `CLOSED`, default `DRAFT`), createdAt, publishedAt, closedAt; indexes on ownerId and status.
- `Question`: id, surveyId (foreign key, deleted with the survey), position, text, type (enum `RATING`,
  `CHOICE`); unique `(surveyId, position)`.
- `QuestionOption`: id, questionId (foreign key, deleted with the question), position, label; unique
  `(questionId, position)` and `(questionId, label)`.

## 5. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F03-01 | A valid survey from a Survey Owner returns 201; it is stored with status DRAFT, `ownerId` equal to the session user (whatever the body says), and its questions and options in the request order. |
| AC-F03-02 | An invalid survey returns 400 `VALIDATION_ERROR` with a `fields` entry for each broken rule, and the number of surveys, questions and options in the database does not change. |
| AC-F03-03 | `GET /api/surveys` returns only the signed-in owner's surveys, and `GET /api/surveys/:id` returns one of them with its questions. |

## 6. Tests

| Test | AC | Level | Precondition or input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-F03-01 | AC-F03-01 | API and DB | Signed-in owner; body with one rating and one choice question, plus `"ownerId": 999` | `POST /api/surveys` | 201, status DRAFT; database row has the session owner's id, not 999; positions 1 and 2; options in order |
| TEST-F03-02 | AC-F03-02 | API and DB | Signed-in owner | Post, one at a time: title of 2 characters; no questions; 21 questions; a rating question with options; a choice question with 1 option; one with 7 options; duplicate options "Latte" and "latte"; unknown type | Each 400 with the matching `fields` key; table counts unchanged |
| TEST-F03-03 | AC-F03-03 | API | Owners A and B each have a survey | Owner A calls `GET /api/surveys`, then `GET /api/surveys/:id` on their own | Only A's surveys listed; detail returns the questions and options |
| UNIT-01 | AC-F03-02 | Unit | Pure function `validateSurveyInput` | Call it with valid and invalid inputs, including boundaries (3 and 120 characters, 2 and 6 options) | Valid inputs give no error; each invalid input gives the expected field message |
| UI-02 | AC-F03-02 | UI component | New survey screen | Submit with an empty title and a choice question with one option | Two field messages shown; no request sent |

## 7. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-11-05 | First version | Written before implementation |
| 1.1 | 2026-11-05 | `responseCount` in the list and the responses column move to F-06 | The `Response` table does not exist before F-06; a constant 0 would be a placeholder, not data |
