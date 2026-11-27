# F-10 Close survey

| | |
|---|---|
| Feature | F-10 Close survey |
| Requirement | FR-12: A Survey Owner closes their own PUBLISHED survey |
| Sprint | 2 |
| Status | Implemented |

## 1. Feature SDS and workflow

A Survey Owner can close a PUBLISHED survey. After closing, no new responses are
accepted (BR-05). The transition is PUBLISHED → CLOSED (BR-02).

**API contract:**

### POST /api/surveys/:id/close

**Preconditions:** Authenticated SURVEY_OWNER, survey is PUBLISHED, owned by caller.

**Response (200):**
```json
{ "data": { "id": 7, "status": "CLOSED", "closedAt": "..." } }
```

| Status | Code | Condition |
|--------|------|-----------|
| 404 | NOT_FOUND | Not found or not owned |
| 409 | INVALID_TRANSITION | Not PUBLISHED |

## 2. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F10-01 | A PUBLISHED survey can be closed by its owner |
| AC-F10-02 | A DRAFT or already CLOSED survey cannot be closed (409) |
| AC-F10-03 | Responses submitted after closing are rejected |

## 3. Software Test Specification

| Test ID | Level | Input | Expected | AC |
|---------|-------|-------|----------|----|
| TEST-F10-01 | API | POST close on PUBLISHED survey | 200, status = CLOSED | AC-F10-01 |
| TEST-F10-02 | API | POST close on DRAFT | 409 | AC-F10-02 |
| TEST-F10-03 | API | Submit response to CLOSED survey | 409 or 404 | AC-F10-03 |

## 4. Definition of Done

- [x] Contract written before implementation
- [x] POST /api/surveys/:id/close route
- [x] "Close survey" button on SurveyDetail for PUBLISHED
- [ ] Teammate review and merge
- [ ] Deployed to GCP
