# F-11 My responses

| | |
|---|---|
| Feature | F-11 My responses |
| Requirement | FR-09: A Respondent lists the surveys they already answered and re-reads their own responses |
| Sprint | 2 |
| Status | Implemented |

## 1. Feature SDS and workflow

A Respondent sees a "My responses" page listing every survey they answered, with the
submission date. Clicking an entry shows their own answers (the same confirmation view
from F-06).

**API contract:**

### GET /api/responses
Returns the signed-in respondent's submitted responses, newest first.

**Response (200):**
```json
{
  "data": [
    { "id": 1, "surveyId": 7, "surveyTitle": "...", "submittedAt": "..." }
  ]
}
```

## 2. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F11-01 | A Respondent sees a list of surveys they answered |
| AC-F11-02 | Each entry links to the response detail (re-read answers) |
| AC-F11-03 | A Respondent who answered nothing sees an empty state |

## 3. Software Test Specification

| Test ID | Level | Input | Expected | AC |
|---------|-------|-------|----------|----|
| TEST-F11-01 | API | GET /api/responses as respondent with 2 responses | 200, 2 items | AC-F11-01 |
| TEST-F11-02 | API | GET /api/responses as respondent with 0 responses | 200, empty | AC-F11-03 |

## 4. Definition of Done

- [x] Contract written before implementation
- [x] GET /api/responses route
- [x] MyResponses page with response list
- [ ] Teammate review and merge
- [ ] Deployed to GCP
