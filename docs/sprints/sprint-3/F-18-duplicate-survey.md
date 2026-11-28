# F-18 Duplicate survey

| | |
|---|---|
| Feature | F-18 Duplicate survey |
| Requirement | FR-18: A Survey Owner duplicates a closed survey as a new DRAFT |
| Sprint | 3 |
| Status | Implemented |

## 1. Feature SDS and workflow

A Survey Owner viewing a CLOSED survey clicks "Duplicate as draft". The server copies
the title (with " (copy)" appended), description, and all questions with their options
into a new DRAFT survey owned by the same user. The new survey has fresh IDs and no
responses. The owner is redirected to the new survey's detail page, where they can edit
questions or publish.

**UI workflow:**

1. Owner opens a CLOSED survey detail page.
2. The "Duplicate as draft" button appears next to "View results".
3. Owner clicks the button; the client calls `POST /api/surveys/:id/duplicate`.
4. The server validates ownership and status = CLOSED, then creates the copy.
5. On success (201), the client navigates to the new survey's detail page.

## 2. API contract

### POST /api/surveys/:id/duplicate

**Preconditions:** Authenticated as SURVEY_OWNER, survey exists and belongs to caller, survey status is CLOSED.

**Request:** No body.

**Response (201):**
```json
{
  "data": {
    "id": 42,
    "title": "Original title (copy)",
    "description": "...",
    "status": "DRAFT",
    "ownerId": 1,
    "createdAt": "...",
    "publishedAt": null,
    "questions": [...]
  }
}
```

**Error responses:**
| Status | Code | Condition |
|--------|------|-----------|
| 404 | NOT_FOUND | Survey does not exist or belongs to another owner |
| 409 | INVALID_STATUS | Survey is not CLOSED (DRAFT or PUBLISHED) |

## 3. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F18-01 | A CLOSED survey is duplicated as a new DRAFT with the same title (+ " (copy)"), description, questions, and options |
| AC-F18-02 | The duplicate has fresh IDs, no responses, and publishedAt = null |
| AC-F18-03 | A DRAFT or PUBLISHED survey cannot be duplicated (409) |
| AC-F18-04 | Another owner's survey cannot be duplicated (404) |
| AC-F18-05 | The UI shows the "Duplicate as draft" button only for CLOSED surveys |

## 4. Software Test Specification

| Test ID | Level | Input | Expected | AC |
|---------|-------|-------|----------|----|
| TEST-F18-01 | API | POST duplicate on CLOSED survey | 201, new DRAFT with same questions/options, " (copy)" title | AC-F18-01, AC-F18-02 |
| TEST-F18-02 | API | POST duplicate on DRAFT and PUBLISHED | 409 INVALID_STATUS | AC-F18-03 |
| TEST-F18-03 | API | POST duplicate on another owner's CLOSED survey | 404 NOT_FOUND | AC-F18-04 |

## 5. Definition of Done

- [x] Contract reviewed before implementation
- [x] Route `POST /api/surveys/:id/duplicate` implemented
- [x] Frontend "Duplicate as draft" button on SurveyDetail for CLOSED
- [x] API client `duplicateSurvey` method added
- [x] Three API tests (TEST-F18-01, TEST-F18-02, TEST-F18-03)
- [ ] Teammate review and merge
- [ ] Deployed to GCP
