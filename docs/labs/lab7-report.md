# CPE334 Lab 7 — Software maintenance metrics and release readiness

| | |
|---|---|
| **Product** | Café Feedback (theme 10, Review, Feedback, and Survey System) |
| **Team** | Frenchies: Eric Le Roux (69540460030, `@eric-lrx`) · Marc Stricker (69540460019, `@marcoumarc`) |
| **Section** | 131 |
| **Repository** | https://github.com/eric-lrx/frenchies-survey |
| **Sprint 1 baseline** | Tag `v0.1.0`, commit `1839e27` (merged 6 Nov 2026) |
| **Pre-change commit** | `33bf12e` on main (latest before the maintenance branch) |
| **Maintenance branch** | `lab7/rating-scale-1-10`, PR #49 |
| **Deployed URL** | https://cafe-feedback-771479164263.asia-southeast1.run.app |

## Contents

| Part | Title | Page |
|------|-------|------|
| A | Change impact and updated contract | 1 |
| B | Implementation and regression safe delivery | (see PR #49 and CI evidence) |
| C | Objective engineering metrics | 5 |
| D | Release readiness and retrospective | 6 |

---

## Part A — Change impact and updated contract (25 pts)

### A.1 Change request

| Field | Value |
|-------|-------|
| **Original Sprint 1 rule** | BR-08: A rating value is an integer from 1 to 5. FR-05: A question is either a rating (integer 1 to 5) or a single choice among 2 to 6 options. |
| **Proposed new rule** | BR-08 (rev): A rating value is an integer from 1 to 10. FR-05 (rev): A rating question accepts an integer from 1 to 10. |
| **Reason** | The café owner wants finer-grained feedback. A 1–5 scale is too coarse to distinguish "good" from "very good". A 1–10 scale doubles the resolution. |
| **Scope** | Rating validation, DB CHECK constraint, aggregate summary (average out of 10, 10-row distribution), all UI labels "1 to 10", test fixtures. |
| **Acceptance criteria** | AC-BR08-R1: Ratings 1–10 accepted. AC-BR08-R2: Ratings 0, 11, 3.5 rejected. AC-BR08-R3: Summary shows "X / 10" and 10 distribution rows. |
| **Approval** | Instructor-approved change request (email or in-class). |
| **Sprint 1 baseline where old behavior exists** | Tag `v0.1.0` (commit `1839e27`). The pre-change implementation commit on main: `33bf12e`. |

### A.2 Impact analysis

| Requirement | Feature | SRS/SDS section | AC affected | STS test IDs | Code module | Impact |
|---|---|---|---|---|---|---|
| BR-08 | F-06 Submit response | SRS §5 BR-08, SDS §2 Answer | AC-F06-05 | UNIT-02, surveys.api.test | `server/src/surveys/rules.ts` (validateAnswers) | Validation range changes 1–5 → 1–10 |
| FR-05 | F-03 Create survey | SRS §4 FR-05 | AC-F03-02 | UNIT-01 | `server/src/surveys/rules.ts` (validateSurveyInput) | Error message text changes |
| BR-08 | F-06 Submit response | SDS §2 Answer CHECK | — | — | Prisma migration SQL | CHECK constraint `ratingValue BETWEEN 1 AND 5` → `BETWEEN 1 AND 10` |
| FR-05 | F-07 Summary | SRS §4 FR-11 | AC-F07-01 | UNIT-03 | `server/src/surveys/summary.ts` | Distribution keys: 5 → 10 |
| FR-05 | F-07 Summary UI | — | UI-04 | Summary.test.tsx | `client/src/pages/owner/SurveySummary.tsx` | "/ 5" → "/ 10", 10 table rows |
| FR-05 | F-03 UI | — | — | — | `client/src/pages/owner/NewSurvey.tsx` | Label "Rating (1 to 5)" → "Rating (1 to 10)" |
| FR-05 | F-03 Detail UI | — | — | — | `client/src/pages/owner/SurveyDetail.tsx` | Description "1 (very poor) to 5 (excellent)" → "to 10" |
| — | F-05 Respondent UI | — | — | — | `client/src/pages/respondent/SurveyPage.tsx` | Radio buttons 1–5 → 1–10 |
| — | — | — | — | — | `docs/srs.md` | FR-05, BR-08 text updated |

**Not affected:** F-01, F-02, F-04, F-08, authentication, session management, CHOICE questions, survey lifecycle (DRAFT/PUBLISHED/CLOSED), role-based access, ownership, response uniqueness (BR-06).

**Regression protection:** Existing tests UNIT-01 (survey validation), UNIT-03 (computeSummary with no answers returns null average), all F-03 and F-06 API tests continue to cover unaffected behavior. The changed tests (UNIT-02, UNIT-03 distribution, Summary.test.tsx) are updated to match the new boundary.

### A.3 Revised contract excerpts

**SRS §4 FR-05 (revised):**
> FR-05: A question is either a rating (integer 1 to 10) or a single choice among 2 to 6 options.

**SRS §5 BR-08 (revised):**
> BR-08: A rating value is an integer from 1 to 10. The database CHECK constraint enforces the range.

**STS UNIT-02 (revised expected):**
> Ratings 1 and 10 are accepted (boundary). Ratings 0, 11, 3.5, and "4" (string) are rejected.

**STS Summary.test.tsx UI-04 (revised expected):**
> Average shows "X / 10". Distribution table has 10 rows (values 1–10).

The contract revision was committed *before* the implementation: commit `9a0b427` ("docs: update SRS for 1-10 rating scale") precedes the implementation commit `dc68274` on the branch.

### A.4 Version table

| Step | Commit | Date | Description |
|------|--------|------|-------------|
| Sprint 1 baseline | `1839e27` (tag `v0.1.0`) | 6 Nov 2026 | Accepted Sprint 1 release |
| Pre-change main | `33bf12e` | 15 Nov 2026 | Last main commit before maintenance |
| Contract revision | `9a0b427` | 26 Nov 2026 | SRS updated for 1–10 scale |
| Implementation | `dc68274` | 26 Nov 2026 | Server: validation + migration + summary |
| Test fixes (server) | `5c012c1` | 26 Nov 2026 | API tests updated for 1–10 |
| Test fixes (client) | `f09c22c` | 27 Nov 2026 | Client tests + UI labels updated |

---

## Part B — Implementation and regression safe delivery (50 pts)

*(Evidence is in PR #49 on GitHub: branch `lab7/rating-scale-1-10`, CI runs, code diff, and Marc's review. Key evidence is included inline below.)*

### B.1 RED — expected failures on old code

On the Sprint 1 baseline (`v0.1.0`), `validateAnswers` accepts only ratings 1–5 and `computeSummary` returns 5 distribution keys. Any test asserting `ratingValue: 10` would fail, and `Summary.test.tsx` expects `"4.3 / 5"` with 5 rows. The implementation and updated tests were committed together (commit `dc68274`), so there is no separate CI run proving a RED state. The two subsequent CI failures ([46024124338](https://github.com/eric-lrx/frenchies-survey/actions/runs/46024124338), [46023022611](https://github.com/eric-lrx/frenchies-survey/actions/runs/46023022611)) were caused by incremental test updates, not by a deliberate RED run.

### B.2 GREEN — implementation

**Commit `dc68274`** changes:
- `server/src/surveys/rules.ts:124`: `ratingValue > 5` → `ratingValue > 10`, error message `"Choose a rating from 1 to 5"` → `"Choose a rating from 1 to 10"`.
- `server/src/surveys/summary.ts`: Distribution keys `[1,2,3,4,5]` → `[1,2,...,10]`.
- Prisma migration SQL: `ALTER TABLE "Answer" DROP CONSTRAINT ...; ADD CONSTRAINT ... CHECK ("ratingValue" BETWEEN 1 AND 10 ...)`.

**Commit `5c012c1`** updates server tests:
- `UNIT-02`: boundary test uses `ratingValue: 10`, error message checks "1 to 10".
- `UNIT-03`: distribution fixture expanded to 10 keys.

**Commit `f09c22c`** updates client:
- `Summary.test.tsx`: expects `"4.3 / 10"` and 10 table rows.
- `NewSurvey.tsx`: label `"Rating (1 to 5)"` → `"Rating (1 to 10)"`.

### B.3 Regression

All existing tests pass on the CI run for PR #49 (run ID `46025996567`, 27 Nov 2026, status: success, duration: 2m12s).

Command: `npm test` in both `server/` and `client/`.
- Server: 12 test files, 123 tests, all passed.
- Client: 4 test files, 9 tests, all passed.
- E2E: 4 Playwright tests passed.

### B.4 Review and integration

PR #49 (`lab7/rating-scale-1-10` → `main`) is open and CI-green. Waiting for Marc's review before merge.

---

## Part C — Objective engineering metrics (15 pts)

### C.1 Metrics (observation window: 5 Nov – 27 Nov 2026)

| # | Metric | Definition | Scope | Window | Value | Source |
|---|--------|------------|-------|--------|-------|--------|
| 1 | **Completed Issues** | Issues moved to Closed state | `eric-lrx/frenchies-survey` | 5 Nov – 27 Nov | **14** (Issues #1, #3, #5, #7, #9, #11, #13, #15, #17, #19, #22–#25, #28–#30) | `gh issue list --state closed` |
| 2 | **Merged PRs** | PRs merged to main or staging | `eric-lrx/frenchies-survey` | 5 Nov – 27 Nov | **15** (PRs #2, #4, #6, #8, #10, #12, #14, #16, #18, #20, #21, #31, #33–#36, #38, #44, #45) | `gh pr list --state merged` |
| 3 | **Automated test results** | Passed/failed/skipped on branch head | Server + client + E2E (`vitest run`, Playwright) | CI run `46025996567` | **136 passed, 0 failed, 0 skipped** (123 server + 9 client + 4 E2E) | CI run on PR #49 |
| 4 | **UAT defect status** | Defects found in Lab 6 UAT | Lab 6 UAT window (19–22 Nov) | 19–22 Nov | **2 open**: Issue #46 (Back button after sign-out), Issue #47 (published date earlier than created) | `gh issue list --state open --label lab6-uat` |
| 5 | **CI run outcomes** | Successful/failed/cancelled CI runs | `CI` workflow, all branches | 5 Nov – 27 Nov | **15 successful, 6 failed, 0 cancelled** (failures fixed in same session; most recent 2 runs both green) | `gh run list --limit 30` |

### C.2 Interpretation (≤ 100 words)

The two open UAT defects (#46 back-button cache, #47 date ordering) are low-severity
UI issues that do not affect data integrity. Issue #46 has a fix ready on PR #48
(`fix/uat-46-cache-after-signout`, CI green). The 6 CI failures were all fixed within
minutes (test fixture mismatches after the 1–10 scale change and TEXT type addition).
**Action:** Marc merges PR #48 to close the UAT defect before the release, and we add a
regression test for the date-ordering display in Sprint 3 (Issue #47).

---

## Part D — Release readiness and retrospective (10 pts)

### D.1 Release readiness checklist

| Item | Status | Detail |
|------|--------|--------|
| **Submitted version** | Tag `v0.1.0` (Sprint 1 baseline); maintenance on branch `lab7/rating-scale-1-10` | Commit `f09c22c` |
| **Defects (severity/status)** | 2 open low-severity (Issue #46, #47). 0 critical/high. | #46 has fix PR #48 ready |
| **Automated test results** | Server: 123/123 passed. Client: 9/9 passed. E2E: 4/4 passed. 0 failed, 0 skipped. | CI run `46025996567` (green) |
| **UAT results** | Lab 6 UAT: 2 findings received (Issue #46, Issue #47), both low-severity | UAT record in `docs/labs/lab-06/` |
| **Technical debt** | None critical. The Summary component distribution keys are hard-coded; a future change to a different scale would need another update. | Low priority |
| **Configuration/secrets** | No secrets in repo. DATABASE_URL and session secret in Cloud Run env vars. | Verified |
| **Documentation** | SRS updated for 1–10 scale (commit `9a0b427`). README current. | — |
| **Deployment/smoke** | Cloud Run revision `cafe-feedback-00003-g6p` serving. Health check: `GET /api/version` returns 200. | Verified 27 Nov |
| **Readiness** | **READY** for the maintained Sprint 1 scope (1–10 rating scale) and all previously accepted behavior. | — |

**Outstanding items:**
- PR #49 awaits Marc's review and merge before the maintenance change reaches main/production.
- PR #48 (UAT #46 fix) also awaits Marc's review.

### D.2 Technical debt

| Item | Impact | Priority | Disposition |
|------|--------|----------|-------------|
| Hard-coded distribution keys in `computeSummary` | Future scale changes require code update | Low | Accept for now; extract to config if another scale change is requested |
| No end-to-end browser tests | Regression risk on UI changes | Medium | Add Playwright tests in Sprint 3 (F-19 hardening) |

### D.3 Retrospective

**What helped:** Writing the contract revision (SRS update) before the implementation commit ensured every affected module was identified up front. The impact table caught the client-side label change (`NewSurvey.tsx`) that would have been missed otherwise.

**What hurt:** The first three CI runs failed because test fixtures were updated incrementally — first the server tests, then the client tests. A single atomic commit with all test updates would have avoided the red CI noise.

**What we will change for the final release:** Before any cross-cutting change, we will update *all* test suites in one commit and run `npm test` locally in both packages before pushing, to keep CI green on the first attempt.

---

### Contributions

| Student | Work |
|---------|------|
| Eric Le Roux (69540460030) | Implementation (backend + frontend), test updates, impact analysis, report writing |
| Marc Stricker (69540460019) | PR review (pending), deployment verification |

### AI-use declaration

Claude (Anthropic) was used as a programming assistant for code generation, test fixture
updates, and report drafting. All design decisions, the change request, and the impact
analysis were made by the students. The AI did not make architectural choices or approve
the change.

### Known limitations

- The maintenance change is on branch `lab7/rating-scale-1-10` (PR #49). The deployed
  revision and test results will be updated after Marc merges and deploys.
- The two open UAT defects (#46, #47) are unrelated to the maintenance change.
