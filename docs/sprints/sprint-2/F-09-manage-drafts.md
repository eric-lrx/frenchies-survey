# F-09 Manage drafts (Edit and delete DRAFT surveys)

| | |
|---|---|
| Feature | F-09 Manage drafts |
| Requirement | FR-06: A Survey Owner edits or deletes the questions of their own DRAFT surveys |
| Sprint | 2 |
| Status | Implemented |

## 1. Feature SDS and workflow

A Survey Owner can edit a DRAFT survey (title, description, questions) and delete a DRAFT
survey entirely. Editing and deleting are blocked once the survey is PUBLISHED (BR-04).

**API contract:**

### PUT /api/surveys/:id
Updates title, description, and questions of a DRAFT survey. The full question list
replaces the existing one (delete-and-recreate within a transaction).

**Preconditions:** Authenticated SURVEY_OWNER, survey exists, owned by caller, status = DRAFT.

| Status | Code | Condition |
|--------|------|-----------|
| 200 | — | Updated survey returned |
| 400 | VALIDATION_ERROR | Same rules as POST /api/surveys |
| 404 | NOT_FOUND | Survey not found or not owned |
| 409 | INVALID_STATUS | Survey is not DRAFT |

### DELETE /api/surveys/:id
Deletes a DRAFT survey and all its questions.

| Status | Code | Condition |
|--------|------|-----------|
| 204 | — | Deleted |
| 404 | NOT_FOUND | Not found or not owned |
| 409 | INVALID_STATUS | Not DRAFT |

## 2. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F09-01 | A DRAFT survey's title, description, and questions can be updated |
| AC-F09-02 | A DRAFT survey can be deleted |
| AC-F09-03 | A PUBLISHED or CLOSED survey cannot be edited or deleted (409) |
| AC-F09-04 | Another owner's survey cannot be edited or deleted (404) |

## 3. Software Test Specification

| Test ID | Level | Input | Expected | AC |
|---------|-------|-------|----------|----|
| TEST-F09-01 | API | PUT valid changes on DRAFT survey | 200, updated data | AC-F09-01 |
| TEST-F09-02 | API | DELETE DRAFT survey | 204 | AC-F09-02 |
| TEST-F09-03 | API | PUT/DELETE on PUBLISHED survey | 409 | AC-F09-03 |
| TEST-F09-04 | API | PUT/DELETE on another owner's DRAFT | 404 | AC-F09-04 |

## 4. Definition of Done

- [x] Contract written before implementation
- [x] PUT /api/surveys/:id route implemented
- [x] DELETE /api/surveys/:id route implemented
- [x] Frontend EditSurvey page
- [x] Frontend delete with ConfirmDialog
- [ ] Teammate review and merge
- [ ] Deployed to GCP
