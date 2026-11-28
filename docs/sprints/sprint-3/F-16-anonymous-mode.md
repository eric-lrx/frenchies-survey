# F-16 Anonymous mode

| | |
|---|---|
| Feature | F-16 Anonymous mode |
| Requirement | FR-16: A Survey Owner publishes a survey in anonymous mode |
| Sprint | 3 |
| Status | Planned |

## 1. Feature SDS and workflow

When creating a survey, the owner can toggle an "Anonymous" switch. An anonymous survey
stores answers without linking them to the respondent's user ID. The `Response` row
stores `respondentId = null` (or a separate anonymous responses table). The one-response-
per-respondent rule (BR-06) is enforced with a session-based or token-based duplicate
guard rather than the `(surveyId, respondentId)` unique key.

**UI changes:**
- NewSurvey / EditSurvey: "Anonymous mode" toggle (disabled after publish, BR-04).
- SurveyDetail: badge "Anonymous" next to status.
- SurveySummary / SurveyResponses: individual responses page is hidden for anonymous
  surveys; summary still works.

**API changes:**
- `POST /api/surveys` and `PUT /api/surveys/:id`: accept `anonymous: boolean`.
- Survey model: add `anonymous Boolean @default(false)`.
- Response model: make `respondentId` nullable when `survey.anonymous = true`.

## 2. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F16-01 | A new survey can be created with anonymous = true |
| AC-F16-02 | An anonymous PUBLISHED survey stores responses without respondentId |
| AC-F16-03 | A respondent cannot submit twice to the same anonymous survey |
| AC-F16-04 | Individual responses are not accessible for an anonymous survey |
| AC-F16-05 | The anonymous flag cannot be changed after the survey is published |

## 3. Software Test Specification

| Test ID | Level | Input | Expected | AC |
|---------|-------|-------|----------|----|
| TEST-F16-01 | API | POST survey with anonymous: true | 201, survey.anonymous = true | AC-F16-01 |
| TEST-F16-02 | API | Submit response to anonymous survey | Response stored, respondentId = null | AC-F16-02 |
| TEST-F16-03 | API | Submit twice to anonymous survey | 409 on second submission | AC-F16-03 |
| TEST-F16-04 | API | GET individual responses for anonymous survey | 403 or empty | AC-F16-04 |
| TEST-F16-05 | API | PUT anonymous flag on published survey | 409 | AC-F16-05 |

## 4. Remaining work

| Item | Owner | Target |
|------|-------|--------|
| Prisma migration (add anonymous column) | Eric | 6 Dec |
| Backend route changes | Eric | 6 Dec |
| Duplicate-guard for anonymous responses | Marc | 8 Dec |
| Frontend toggle and badge | Eric | 8 Dec |
| Tests (5 API tests) | Marc | 10 Dec |
| Review and merge | Marc | 11 Dec |
