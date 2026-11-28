# F-12 Text questions

| | |
|---|---|
| Feature | F-12 Text questions |
| Requirement | FR-15: A question can be a short text answer |
| Sprint | 2 |
| Status | Implemented |

## 1. Feature SDS and workflow

A new question type "TEXT" (free text) is added alongside RATING and CHOICE. A text
question accepts a string answer of 1–1000 characters with no options. The answer is
stored in `Answer.textValue`.

**Data changes:**
- Prisma `QuestionType` enum: add `TEXT`.
- `Answer` model: add `textValue String?`.
- CHECK constraint: exactly one of `ratingValue`, `optionId`, `textValue` is non-null.
- Migration: `ALTER TYPE "QuestionType" ADD VALUE 'TEXT'`, add column, update CHECK.

**API changes:**
- `validateSurveyInput`: accept `type: "TEXT"`, no options allowed.
- `validateAnswers`: TEXT question requires `textValue` (string, 1–1000 chars, trimmed).
- `computeSummary`: TEXT questions return `answerCount` (no distribution).

**UI changes:**
- NewSurvey / EditSurvey: "Free text" in question type dropdown.
- SurveyPage (respondent): textarea with character counter for TEXT questions.
- ResponseConfirmation: show textValue for TEXT answers.
- SurveySummary: TextResult component showing answer count.
- SurveyResponses: textValue column in individual responses table.

## 2. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F12-01 | A survey can include TEXT questions alongside RATING and CHOICE |
| AC-F12-02 | A TEXT question has no options |
| AC-F12-03 | A respondent submits a text answer of 1–1000 characters |
| AC-F12-04 | An empty or >1000 char text answer is rejected |
| AC-F12-05 | The summary shows the number of text answers |
| AC-F12-06 | Individual responses show the text value |

## 3. Software Test Specification

| Test ID | Level | Input | Expected | AC |
|---------|-------|-------|----------|----|
| TEST-F12-01 | Unit | validateSurveyInput with type TEXT, no options | ok: true | AC-F12-01, AC-F12-02 |
| TEST-F12-02 | Unit | validateAnswers with textValue | ok: true, textValue trimmed | AC-F12-03 |
| TEST-F12-03 | Unit | validateAnswers with empty textValue | error | AC-F12-04 |
| TEST-F12-04 | Unit | validateAnswers with >1000 chars | error | AC-F12-04 |
| TEST-F12-05 | UI | SurveySummary with TEXT question | Shows answer count | AC-F12-05 |

## 4. Definition of Done

- [x] Contract written before implementation
- [x] Prisma migration (TEXT enum, textValue column, CHECK constraint)
- [x] Backend validation (rules.ts) for TEXT
- [x] Backend summary (summary.ts) for TEXT
- [x] Frontend: all 5 pages updated for TEXT
- [x] Tests updated (UNIT-01, UNIT-02, API test)
- [ ] Teammate review and merge
- [ ] Deployed to GCP
