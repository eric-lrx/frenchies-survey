# F-04 Publish survey

| | |
|---|---|
| Requirements | FR-07, BR-02, BR-03 |
| Depends on | F-03 |
| Version | 1.1, 2026-11-05 (see section 7) |

## 1. Behaviour

A Survey Owner publishes one of their own DRAFT surveys. Publishing makes it visible to respondents and
freezes its questions (BR-04). It cannot be undone (D-11).

**State machine (BR-02).**

```
DRAFT --publish--> PUBLISHED --close (Sprint 2)--> CLOSED
```

Only DRAFT can be published. Publishing a PUBLISHED or CLOSED survey is rejected with 409
`INVALID_TRANSITION`, and the response says the current status.

**BR-03.** A survey with no question is refused with 409 `SURVEY_HAS_NO_QUESTIONS`. In Sprint 1 creation
already requires one question, so this check cannot fail yet. It is implemented now so that Sprint 2 draft
editing (F-09) cannot bypass it. It is already tested in Sprint 1 (TEST-F04-04) on a draft without
questions created directly in the test database.

**Concurrency.** The change is a single conditional update: set status PUBLISHED and `publishedAt` where
`id`, `ownerId` and `status = DRAFT` all match. If no row is updated, the API reads the survey again: not
found or not owned gives 404, any other status gives 409. Two simultaneous publish requests therefore end
with one success and one 409, never with two writes.

## 2. API

**`POST /api/surveys/:id/publish`** (Survey Owner, own survey; no body)

| Result | Status | Body |
|---|---|---|
| Published | 200 | `{"data":{"id":7,"status":"PUBLISHED","publishedAt":"2026-11-06T03:12:00.000Z"}}` |
| Not DRAFT | 409 | `{"error":{"code":"INVALID_TRANSITION","message":"Only a draft survey can be published.","currentStatus":"PUBLISHED"}}` |
| No question | 409 | `{"error":{"code":"SURVEY_HAS_NO_QUESTIONS","message":"Add at least one question before publishing."}}` |
| Not found or not owned | 404 | `{"error":{"code":"NOT_FOUND","message":"Survey not found."}}` |

## 3. UI

On the survey detail page, a "Publish" button appears only while the status is DRAFT. It opens a
confirmation dialog: "Once published, respondents can answer and the questions can no longer be changed."
with "Publish" and "Cancel". The dialog can be used with the keyboard and returns focus to the button when
it closes. After success the status badge reads PUBLISHED and the button disappears. A 409 shows its message
and reloads the survey.

## 4. Data

No schema change (`status` and `publishedAt` come from F-03).

## 5. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F04-01 | An owner publishing their own DRAFT survey gets 200; the stored status is PUBLISHED and `publishedAt` is set. |
| AC-F04-02 | Publishing a survey that is PUBLISHED or CLOSED returns 409 `INVALID_TRANSITION` with the current status, and the stored status and `publishedAt` do not change. |

## 6. Tests

| Test | AC | Level | Precondition or input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-F04-01 | AC-F04-01 | API and DB | Owner's DRAFT survey | `POST /api/surveys/:id/publish` | 200; database status PUBLISHED, `publishedAt` not null |
| TEST-F04-02 | AC-F04-02 | API and DB | Owner's PUBLISHED survey, and a CLOSED one | Publish each | Both 409 `INVALID_TRANSITION` with `currentStatus`; status and `publishedAt` unchanged |
| TEST-F04-03 | AC-F04-02 | API (concurrency) | Owner's DRAFT survey | Send two publish requests at the same time | One 200 and one 409; `publishedAt` set once |
| TEST-F04-04 | AC-F04-02 | API and DB | Owner's DRAFT survey with no question, created directly in the test database | Publish it | 409 `SURVEY_HAS_NO_QUESTIONS`; still DRAFT, `publishedAt` null |
| E2E-01 | AC-F04-01 | End to end | See F-07 | Publish through the dialog | Badge shows PUBLISHED |

## 7. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-11-05 | First version | Written before implementation |
| 1.1 | 2026-11-05 | BR-03 tested now (TEST-F04-04) instead of in Sprint 2 | A draft without questions can be created directly in the test database, so the rule does not need F-09 to be tested |
