# F-14 Individual responses and CSV export

| | |
|---|---|
| Feature | F-14 Individual responses and CSV export |
| Requirement | FR-14: A Survey Owner reads individual responses of an identified survey and exports them as CSV |
| Sprint | 2 |
| Status | Implemented |

## 1. Feature SDS and workflow

The survey summary page includes a link to "View individual responses". This page shows
a table with one row per response and one column per question, plus the respondent email
and submission date. An "Export CSV" button downloads the same data as a CSV file.

**API contract:**

### GET /api/surveys/:id/responses
Returns all individual responses for a survey owned by the caller.

**Response (200):**
```json
{
  "data": {
    "surveyId": 7,
    "questions": [...],
    "responses": [
      {
        "id": 1,
        "respondentName": "...",
        "respondentEmail": "...",
        "submittedAt": "...",
        "answers": [
          { "questionId": 1, "ratingValue": 4 },
          { "questionId": 2, "optionLabel": "Latte" }
        ]
      }
    ]
  }
}
```

### GET /api/surveys/:id/responses/csv
Returns the same data as a CSV download (Content-Type: text/csv).

## 2. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F14-01 | The owner sees individual responses in a table |
| AC-F14-02 | Each response shows the respondent, date, and all answers |
| AC-F14-03 | The CSV download contains the same data |
| AC-F14-04 | Another owner cannot access the responses (404) |

## 3. Software Test Specification

| Test ID | Level | Input | Expected | AC |
|---------|-------|-------|----------|----|
| TEST-F14-01 | API | GET /api/surveys/:id/responses | 200, correct data | AC-F14-01, AC-F14-02 |
| TEST-F14-02 | API | GET /api/surveys/:id/responses/csv | 200, text/csv | AC-F14-03 |
| TEST-F14-03 | API | GET responses for another owner | 404 | AC-F14-04 |

## 4. Definition of Done

- [x] Contract written before implementation
- [x] GET /api/surveys/:id/responses route
- [x] GET /api/surveys/:id/responses/csv route
- [x] SurveyResponses page with table
- [x] CSV export button
- [ ] Teammate review and merge
- [ ] Deployed to GCP
