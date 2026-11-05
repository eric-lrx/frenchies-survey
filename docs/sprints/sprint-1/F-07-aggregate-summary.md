# F-07 Aggregate summary

| | |
|---|---|
| Requirements | FR-11, BR-11 (and BR-01: own surveys only) |
| Depends on | F-06 |
| Version | 1.0, 2026-11-05 |

## 1. Behaviour

A Survey Owner reads the results of one of their own surveys, in any status: how many responses, and for
each question either the rating average and the count of each rating, or the count of each option. The
summary contains numbers only: no respondent name, id or email, and no individual response (D-06).

**Calculation rules (BR-11).**
- `responseCount` is the number of stored responses for the survey.
- For a rating question, `distribution` always has the five keys `"1"` to `"5"`, with 0 where nobody chose
  that value. `average` is `round(10 × sum ÷ count) ÷ 10`, rounded half up, computed with integers so that
  4.25 becomes 4.3 without floating-point surprises. With no answers, `average` is `null`, not 0.
- For a choice question, every option is listed in its position order with its count, including options
  chosen by nobody.
- The figures come from three aggregate queries (response count, rating counts grouped by question and
  value, option counts grouped by option), not one query per question or per response.

## 2. API

**`GET /api/surveys/:id/summary`** (Survey Owner, own survey)

```json
{ "data": {
  "surveyId": 7, "title": "Spring menu feedback", "status": "PUBLISHED", "responseCount": 3,
  "questions": [
    { "questionId": 21, "position": 1, "text": "How would you rate the new pastries?", "type": "RATING",
      "average": 4.3, "distribution": { "1": 0, "2": 0, "3": 0, "4": 2, "5": 1 } },
    { "questionId": 22, "position": 2, "text": "Which drink did you order?", "type": "CHOICE",
      "options": [ { "optionId": 5, "label": "Latte", "count": 2 }, { "optionId": 6, "label": "Iced tea", "count": 0 },
                   { "optionId": 7, "label": "Espresso", "count": 1 } ] }
  ] } }
```

404 `NOT_FOUND` when the survey does not exist or belongs to another owner (F-02).

## 3. UI

**Summary** (`/owner/surveys/:id/summary`, linked from the survey detail):
- The response count first ("3 responses").
- For a rating question: the average written as "4.3 / 5", and one row per value 1 to 5 with a bar and the
  count written next to it, so the information does not rely on colour or bar length alone.
- For a choice question: one row per option with its count and its percentage of responses, rounded to a
  whole number.
- Empty state: "No responses yet", with the questions still listed and averages shown as "—".

## 4. Data

No schema change; the summary reads `Response`, `Answer`, `Question` and `QuestionOption`.

## 5. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F07-01 | For a survey with responses, the owner's summary returns `responseCount`, each rating `average` and `distribution`, and each option count, all equal to values computed directly from the database for that survey. |
| AC-F07-02 | For a survey with no response, the summary returns `responseCount` 0, `average` null, all distribution values 0 and all option counts 0. |
| AC-F07-03 | The summary body contains no respondent id, name or email, and no individual response. |

## 6. Tests

| Test | AC | Level | Precondition or input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-F07-01 | AC-F07-01 | API and DB | Survey with ratings 5, 4, 4 and choices Latte, Latte, Espresso, plus responses to another survey | Owner calls the summary | `responseCount` 3, `average` 4.3, distribution 0,0,0,2,1, counts 2, 0, 1; each equal to a direct Prisma count for this survey only |
| TEST-F07-02 | AC-F07-02 | API | PUBLISHED survey with no response | Owner calls the summary | 0, null, zeros everywhere |
| TEST-F07-03 | AC-F07-03 | API | Survey answered by seeded respondents | Owner calls the summary | The JSON contains none of the respondents' ids, names or emails, and no `respondentId` or `answers` key |
| UNIT-03 | AC-F07-01, AC-F07-02 | Unit | Pure function `computeSummary` | Ratings 4 and 5; 1, 2, 2; 3, 4, 4, 4; no ratings | 4.5; 1.7; 3.8; null |
| UI-04 | AC-F07-02 | UI component | Summary screen, API mocked | Render a summary with 0 responses, then one with data | "No responses yet" and "—"; then "4.3 / 5" and every count written as text |
| E2E-01 | AC-F03-01, AC-F04-01, AC-F05-01, AC-F06-01, AC-F07-01 | End to end | Seeded owner Camille and respondent Alice | Camille creates a survey with one rating and one choice question and publishes it; Alice signs in, answers 4 and "Latte", sees the confirmation; Camille opens the summary | Summary shows "1 response", "4.0 / 5", and Latte 1 |

## 7. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-11-05 | First version | Written before implementation |
