# F-17 Analysis filters and trend

| | |
|---|---|
| Feature | F-17 Analysis filters and trend |
| Requirement | FR-17: A Survey Owner filters results by date range and sees responses per day |
| Sprint | 3 |
| Status | Planned |

## 1. Feature SDS and workflow

The summary page gains a date-range picker (from / to). The server filters responses
whose `submittedAt` falls within the range and recomputes the summary. Below the summary,
a "Responses per day" line chart shows the daily count over the filtered period.

**API changes:**
- `GET /api/surveys/:id/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`: optional query params.
- New field in response: `dailyCounts: { date: string; count: number }[]`.

**UI changes:**
- Two date inputs above the summary section.
- A simple bar or line chart (HTML table or lightweight SVG) showing daily response counts.

## 2. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F17-01 | Summary can be filtered by from and to dates |
| AC-F17-02 | Responses outside the date range are excluded from average and counts |
| AC-F17-03 | Daily response counts are returned for the filtered range |
| AC-F17-04 | No filter returns all responses (backward compatible) |
| AC-F17-05 | Invalid date range (from > to) returns 400 |

## 3. Software Test Specification

| Test ID | Level | Input | Expected | AC |
|---------|-------|-------|----------|----|
| TEST-F17-01 | API | GET summary with from and to | Filtered summary, correct counts | AC-F17-01, AC-F17-02 |
| TEST-F17-02 | API | GET summary with from only | Responses from that date onward | AC-F17-01 |
| TEST-F17-03 | API | GET summary with no dates | All responses (backward compatible) | AC-F17-04 |
| TEST-F17-04 | API | GET summary with from > to | 400 | AC-F17-05 |
| TEST-F17-05 | API | GET summary with valid range | dailyCounts array matches actual daily submissions | AC-F17-03 |

## 4. Remaining work

| Item | Owner | Target |
|------|-------|--------|
| Backend: date filter on summary query | Eric | 6 Dec |
| Backend: dailyCounts aggregation | Eric | 7 Dec |
| Frontend: date pickers | Marc | 8 Dec |
| Frontend: daily chart (SVG table) | Marc | 9 Dec |
| Tests (5 API tests) | Eric | 10 Dec |
| Review and merge | Marc | 11 Dec |
