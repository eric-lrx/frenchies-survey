# F-06 Submit response

| | |
|---|---|
| Requirements | FR-10, BR-05, BR-06, BR-07, BR-08, BR-09, BR-10, NFR-04 |
| Depends on | F-05 |
| Version | 1.0, 2026-11-05 |

## 1. Behaviour

A Respondent answers every question of a PUBLISHED survey and submits once. The response is stored under
the signed-in respondent, and they see a confirmation with their own answers. A second submission is
refused, even when two arrive at the same moment. A submitted response is final: no route changes or
deletes it.

**Order of checks.**
1. Session and role (F-01, F-02): 401 or 403.
2. The survey: missing or DRAFT gives 404 `NOT_FOUND` (a respondent cannot know a draft exists). CLOSED
   gives 409 `SURVEY_NOT_OPEN` (BR-05). A respondent who opened the form before the survey closed gets a
   clear reason.
3. Already answered gives 409 `DUPLICATE_RESPONSE` (BR-06).
4. Answer validation gives 400 `VALIDATION_ERROR` (BR-07, BR-08).
5. Storage: the response and its answers are inserted in one transaction, which reads the survey status
   again first. The database's unique constraint on `(surveyId, respondentId)` is the final guard. If two
   requests both pass step 3, the second insert violates the constraint and is answered with 409
   `DUPLICATE_RESPONSE`, and nothing of it is stored (NFR-04).

**Answer validation.**

| Case | Error key and message |
|---|---|
| A question of the survey has no answer | `answers[<questionId>]`: "Please answer this question" |
| An answer targets a question that is not in this survey | `answers`: "Unknown question" |
| Two answers for the same question | `answers[<questionId>]`: "Answer once" |
| Rating question: value missing, not an integer, or outside 1 to 5 | `answers[<questionId>]`: "Choose a rating from 1 to 5" |
| Choice question: `optionId` missing or not one of that question's options | `answers[<questionId>]`: "Choose one of the options" |
| A rating answer with `optionId`, or a choice answer with `ratingValue` | `answers[<questionId>]`: "Wrong answer type for this question" |

## 2. API

**`POST /api/open-surveys/:id/responses`** (Respondent)

```json
{ "answers": [ { "questionId": 21, "ratingValue": 4 }, { "questionId": 22, "optionId": 5 } ] }
```

| Result | Status | Body |
|---|---|---|
| Stored | 201 | `{"data":{"id":31,"surveyId":7,"submittedAt":"...","answers":[{"questionId":21,"ratingValue":4},{"questionId":22,"optionId":5}]}}` |
| Invalid answers | 400 | `{"error":{"code":"VALIDATION_ERROR","message":"Some answers are missing or invalid.","fields":{"answers[22]":"Choose one of the options"}}}` |
| Missing or DRAFT survey | 404 | `{"error":{"code":"NOT_FOUND","message":"Survey not found."}}` |
| CLOSED survey | 409 | `{"error":{"code":"SURVEY_NOT_OPEN","message":"This survey is closed."}}` |
| Already answered | 409 | `{"error":{"code":"DUPLICATE_RESPONSE","message":"You have already answered this survey."}}` |

**`GET /api/responses/:id`** (Respondent, own response)

`200 {"data":{"id":31,"surveyId":7,"surveyTitle":"...","submittedAt":"...","answers":[{"questionId":21,"questionText":"...","type":"RATING","ratingValue":4},{"questionId":22,"questionText":"...","type":"CHOICE","optionId":5,"optionLabel":"Latte"}]}}`,
or 404 when the response does not exist or belongs to someone else (F-02).

There is no `PUT`, `PATCH` or `DELETE` on responses. Such a request reaches the JSON 404 handler (F-08).

## 3. UI

- **Fill survey** (`/surveys/:id`): each question is a `fieldset` with its text as `legend`. A rating is a
  row of five labelled radio buttons, with the scale written out ("1 = very poor, 5 = excellent"). A choice
  is a group of labelled radio buttons. All questions are required, and an unanswered question shows
  "Please answer this question" next to it. "Submit" is disabled and reads "Sending…" while the request
  runs, so a double click sends one request. On 400 the answers stay selected and the messages appear next
  to their questions.
- **409 responses.** `DUPLICATE_RESPONSE` shows "You have already answered this survey." and
  `SURVEY_NOT_OPEN` shows "This survey is closed.", each with a link back to "Open surveys".
- **Confirmation** (`/responses/:id`): "Thank you, your response was recorded" with the date and time in
  Asia/Bangkok, the survey title, and the respondent's own answers.

## 4. Data

Migration `responses`:
- `Response`: id, surveyId (foreign key), respondentId (foreign key to User), submittedAt; unique
  `(surveyId, respondentId)`; index on surveyId.
- `Answer`: id, responseId (foreign key, deleted with the response), questionId (foreign key), ratingValue
  (integer, nullable), optionId (foreign key to QuestionOption, nullable); unique `(responseId,
  questionId)`; index on questionId.
- Two check constraints, added as SQL in the migration because Prisma does not declare them:
  `ratingValue BETWEEN 1 AND 5`, and exactly one of `ratingValue` and `optionId` is set.

## 5. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F06-01 | A valid response to a PUBLISHED survey returns 201; one response is stored with `respondentId` equal to the session user, with one answer per question; `GET /api/responses/:id` returns the same answers to that respondent. |
| AC-F06-02 | A second submission by the same respondent to the same survey returns 409 `DUPLICATE_RESPONSE`, and exactly one response from that respondent exists for that survey. |
| AC-F06-03 | A submission to a DRAFT survey returns 404 `NOT_FOUND`, and nothing is stored. |
| AC-F06-04 | A submission to a CLOSED survey returns 409 `SURVEY_NOT_OPEN`, and nothing is stored. |
| AC-F06-05 | A submission that breaks any rule of the answer validation table returns 400 `VALIDATION_ERROR` with the matching `fields` key, and no response or answer is stored. |
| AC-F06-06 | Two submissions by the same respondent sent at the same time give one 201 and one 409, and exactly one response is stored. |
| AC-F06-07 | `PUT`, `PATCH` and `DELETE` on `/api/responses/:id` by its own respondent return 404, and the response and its answers are unchanged. |

## 6. Tests

| Test | AC | Level | Precondition or input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-F06-01 | AC-F06-01 | API and DB | PUBLISHED survey with a rating and a choice question; respondent signed in | Submit valid answers, then `GET /api/responses/:id` | 201; one row with the session respondent's id and two answers; GET returns the same values |
| TEST-F06-02 | AC-F06-02 | API and DB | The respondent has already answered | Submit valid answers again | 409 `DUPLICATE_RESPONSE`; count for that respondent and survey is 1 |
| TEST-F06-03 | AC-F06-03 | API and DB | DRAFT survey | Submit | 404; response count unchanged |
| TEST-F06-04 | AC-F06-04 | API and DB | CLOSED survey (seeded) | Submit | 409 `SURVEY_NOT_OPEN`; response count unchanged |
| TEST-F06-05 | AC-F06-05 | API and DB | PUBLISHED survey | Submit, one at a time: one answer missing; an unknown question; two answers for one question; ratings 0, 6 and 2.5; an option from another question; a rating answer with `optionId` | Each 400 with its `fields` key; no response or answer stored |
| TEST-F06-06 | AC-F06-06 | API and DB (concurrency) | PUBLISHED survey; respondent has not answered | Send two valid submissions at the same time | One 201 and one 409; exactly one response stored |
| TEST-F06-07 | AC-F06-07 | API and DB | The respondent's stored response | `PUT`, `PATCH`, `DELETE` on `/api/responses/:id` | Each 404; answers unchanged |
| UNIT-02 | AC-F06-05 | Unit | Pure function `validateAnswers(questions, answers)` | Valid answers, each invalid case, boundaries 1 and 5 | No error for valid; the right key and message for each invalid case |
| UI-03 | AC-F06-02 | UI component | Fill survey screen, API mocked | Double-click Submit; then answer 409 `DUPLICATE_RESPONSE` | One request sent; the duplicate message and the link back are shown |
| E2E-02 | AC-F06-02 | End to end | A seeded respondent who already answered "Spring menu feedback" | Open that survey by URL | The page says it was already answered; no form is offered |

## 7. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-11-05 | First version | Written before implementation |
