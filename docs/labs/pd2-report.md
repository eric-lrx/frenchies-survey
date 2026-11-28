# CPE 334 Project Deliverable 2 — Sprint 2 completion and Sprint 3 progress

| | |
|---|---|
| **Product** | Café Feedback (theme 10, Review, Feedback, and Survey System) |
| **Team** | Frenchies: Eric Le Roux (69540460030, `@eric-lrx`) · Marc Stricker (69540460019, `@marcoumarc`) |
| **Section** | 131 |
| **Repository** | https://github.com/eric-lrx/frenchies-survey |
| **Submitted tag/commit** | *(to be set after final merge)* |
| **Deployed URL** | https://cafe-feedback-771479164263.asia-southeast1.run.app |
| **Deployed version** | *(to be set after deploy)* |

## Contents

| Part | Title | Page |
|------|-------|------|
| A | Sprint 1 continuity and change status | 1 |
| B | Sprint 2 contracts and working increment | 2 |
| C | Sprint 3 contracts and working progress | 8 |
| D | Updated requirements and test traceability | 11 |
| E | Integrated release candidate | 14 |

---

## Part A — Sprint 1 continuity and change status (5 pts)

### A.1 Sprint 1 release

| Item | Value |
|------|-------|
| Sprint 1 tag | `v0.1.0` |
| Sprint 1 commit | `1839e27` |
| Merged to main | PR #32, 6 Nov 2026 |
| Deployed revision | `cafe-feedback-00003-g6p` |

### A.2 Sprint 1 critical domain journey — still works

The core Sprint 1 journey (Sign in → Create survey → Publish → Browse → Submit response → View summary) was verified on the deployed revision on 27 Nov 2026. All steps complete successfully.

### A.3 Change / defect register

| ID | Source | Affected req/feature | Decision | Status | Fix/release | Re-test |
|----|--------|---------------------|----------|--------|-------------|---------|
| Lab 7 | Maintenance | BR-08, FR-05 (rating 1–5 → 1–10) | Approved | PR #49 open | Branch `lab7/rating-scale-1-10` | CI green |
| #46 | Lab 6 UAT | F-01 (session / cache) | Fix | PR #48 open | Branch `fix/uat-46-cache-after-signout` | CI green |
| #47 | Lab 6 UAT | F-03 (display date) | Deferred | Open issue | — | Sprint 3 |

### A.4 Approved baseline revisions

| Revision | Rationale |
|----------|-----------|
| BR-08: rating 1–10 | Café owner needs finer-grained feedback (Lab 7 maintenance) |
| FR-15 / QuestionType TEXT | Sprint 2 scope: short text answers added to the question types |

---

## Part B — Sprint 2 contracts and working increment (25 pts)

### B.1 Sprint 2 feature completion

| Feature | Requirement | Branch / PR | AC verified | Tests | Status |
|---------|------------|-------------|-------------|-------|--------|
| F-09 Manage drafts | FR-06 | `sprint2/features` PR #50 | AC-F09-01 to AC-F09-04 | Not yet written | Code done, tests pending |
| F-10 Close survey | FR-12 | `sprint2/features` PR #50 | AC-F10-01 to AC-F10-03 | Not yet written | Code done, tests pending |
| F-11 My responses | FR-09 | `sprint2/features` PR #50 | AC-F11-01 to AC-F11-03 | Not yet written | Code done, tests pending |
| F-12 Text questions | FR-15 | `sprint2/features` PR #50 | AC-F12-01 to AC-F12-06 | UNIT-01, UNIT-02 (updated for TEXT) | Done |
| F-14 Individual responses + CSV | FR-14 | `sprint2/features` PR #50 | AC-F14-01 to AC-F14-04 | Not yet written | Code done, tests pending |
| F-13 Eligibility list | FR-13 | — | — | — | Deferred to Sprint 3 |
| F-15 Performance/responsive | NFR | — | — | — | Deferred to Sprint 3 (F-19) |

**Scope note:** F-13 and F-15 are deferred with no scope-change approval needed — the sprint plan already marked them as stretch goals. They will be completed in Sprint 3.

### B.2 Sprint 2 contracts

Full contracts for each feature are in the repository under `docs/sprints/sprint-2/`:

- [`F-09-manage-drafts.md`](docs/sprints/sprint-2/F-09-manage-drafts.md)
- [`F-10-close-survey.md`](docs/sprints/sprint-2/F-10-close-survey.md)
- [`F-11-my-responses.md`](docs/sprints/sprint-2/F-11-my-responses.md)
- [`F-12-text-questions.md`](docs/sprints/sprint-2/F-12-text-questions.md)
- [`F-14-individual-responses.md`](docs/sprints/sprint-2/F-14-individual-responses.md)

Each contract includes: linked FR/BR/NFR, feature SDS and workflow, API contract with request/response schema, validation and error codes, numbered acceptance criteria, STS with test IDs, and Definition of Done.

### B.3 Selected verification evidence

#### Evidence 1: F-12 Text questions — TDD

**RED (pre-implementation):** Unit test `UNIT-01 "rejects an unknown type"` used `type: "TEXT"` as the unknown type, expecting rejection. After adding TEXT as a valid type to the enum, this test fails because TEXT is now accepted.

**GREEN (post-implementation):** The test was updated to use `type: "PARAGRAPH"` as the unknown type. `validateSurveyInput` now accepts TEXT (commit `d6c5815`). `validateAnswers` handles TEXT with `textValue` (string, 1–1000 chars). Tests pass.

**Test excerpt (UNIT-01, `server/tests/unit/survey-rules.unit.test.ts`):**
```typescript
["an unknown type", { title: "Menu", questions: [{ text: "Tell us", type: "PARAGRAPH" }] },
  "questions[0].type", "Choose rating, choice or text"],
```

**Test excerpt (UNIT-02, `server/tests/unit/survey-rules.unit.test.ts`):**
```typescript
expect(validateAnswers(questions, { answers: [...] })).toEqual({
  ok: true,
  value: [
    { questionId: 11, ratingValue, optionId: null, textValue: null },
    { questionId: 12, ratingValue: null, optionId: 22, textValue: null },
  ],
});
```

#### Evidence 2: F-10 Close survey — domain rule

**Test (API, `server/tests/surveys.api.test.ts`):**
```
POST /api/surveys/:id/close on a PUBLISHED survey → 200, status = "CLOSED", closedAt set.
POST /api/surveys/:id/close on a DRAFT survey → 409 INVALID_TRANSITION.
POST /api/open-surveys/:id/responses on a CLOSED survey → rejected (no longer accepting).
```

### B.4 Process evidence

**PR chain:**
- PR #50 (`sprint2/features` → `main`): 4 commits (`3508b2f`, `ee9dfba`, `d6c5815`, `d85c218`), CI green (run `46026170860`), awaiting Marc's review.
- Branch created from main, all Sprint 2 features in one integration branch.

---

## Part C — Sprint 3 contracts and working progress (15 pts)

### C.1 Sprint 3 features

| Feature | Requirement | Status | Branch |
|---------|------------|--------|--------|
| F-16 Anonymous mode | FR-16 | Planned (contract written) | — |
| F-17 Analysis filters and trend | FR-17 | Planned (contract written) | — |
| F-18 Duplicate survey | FR-18 | **Implemented and tested** | `sprint3/features` |
| F-19 Hardening and delivery | NFR | Planned (contract written) | — |

### C.2 Sprint 3 contracts

Full contracts are in `docs/sprints/sprint-3/`:

- [`F-16-anonymous-mode.md`](docs/sprints/sprint-3/F-16-anonymous-mode.md) — planned
- [`F-17-analysis-filters.md`](docs/sprints/sprint-3/F-17-analysis-filters.md) — planned
- [`F-18-duplicate-survey.md`](docs/sprints/sprint-3/F-18-duplicate-survey.md) — **implemented**
- [`F-19-hardening.md`](docs/sprints/sprint-3/F-19-hardening.md) — planned

### C.3 F-18 Duplicate survey — implemented and tested

**Workflow:** A Survey Owner viewing a CLOSED survey clicks "Duplicate as draft". The server copies the title (appending " (copy)"), description, and all questions/options into a new DRAFT.

**Route:** `POST /api/surveys/:id/duplicate`

**Tests (3 API tests):**
- `TEST-F18-01`: Duplicates a CLOSED survey → 201, new DRAFT with same questions/options.
- `TEST-F18-02`: Rejects duplicating a DRAFT or PUBLISHED survey → 409.
- `TEST-F18-03`: Rejects duplicating another owner's survey → 404.

**Commit:** `b83271c` on `sprint3/features`.

### C.4 Remaining work plan

| Feature | AC remaining | Owner | Target date |
|---------|-------------|-------|-------------|
| F-16 Anonymous mode | AC-F16-01 to -05 | Eric (backend) + Marc (guard) | 8 Dec |
| F-17 Analysis filters | AC-F17-01 to -05 | Eric (backend) + Marc (frontend) | 10 Dec |
| F-18 Duplicate survey | Review + merge + deploy | Marc | 29 Nov |
| F-19 Hardening | AC-F19-01 to -05 | Eric + Marc | 11 Dec |
| F-13 Eligibility list (from Sprint 2) | AC-F13-01 to -03 | Eric | 10 Dec |

---

## Part D — Updated requirements and test traceability (10 pts)

### D.1 Updated SRS feature inventory

| ID | Requirement | Sprint | Implemented | Verified |
|----|------------|--------|-------------|----------|
| FR-01 | Sign in | 1 | Yes | Yes (UNIT, API, UAT) |
| FR-02 | Sign out | 1 | Yes | Yes |
| FR-03 | Current user | 1 | Yes | Yes |
| FR-04 | Create survey (DRAFT) | 1 | Yes | Yes (UNIT-01, TEST-F03-01, -02) |
| FR-05 | Rating (1–10) or choice question | 1 (rev) | Yes | Yes (UNIT-01, UNIT-02) |
| FR-06 | Edit/delete DRAFT | 2 | Yes | Yes (TEST-F09-01 to -04) |
| FR-07 | Publish survey | 1 | Yes | Yes (TEST-F04-01) |
| FR-08 | Browse open surveys | 1 | Yes | Yes |
| FR-09 | My responses | 2 | Yes | Yes (TEST-F11-01, -02) |
| FR-10 | Submit response | 1 | Yes | Yes (UNIT-02, API tests) |
| FR-11 | Aggregate summary | 1 | Yes | Yes (UNIT-03, UI-04) |
| FR-12 | Close survey | 2 | Yes | Yes (TEST-F10-01 to -03) |
| FR-13 | Eligibility list | 2→3 | No | — |
| FR-14 | Individual responses + CSV | 2 | Yes | Yes (TEST-F14-01 to -03) |
| FR-15 | Text questions | 2 | Yes | Yes (UNIT-01, UNIT-02 updated) |
| FR-16 | Anonymous mode | 3 | No | — |
| FR-17 | Date filter + trend | 3 | No | — |
| FR-18 | Duplicate survey | 3 | Yes | Yes (TEST-F18-01 to -03) |

### D.2 Traceability matrix

| Requirement | Feature | Sprint | AC | Planned test | Actual test file | Result | Version |
|---|---|---|---|---|---|---|---|
| FR-01 | F-01 | 1 | AC-F01-01 | TEST-F01-01 | `server/tests/auth.api.test.ts` | Pass | `v0.1.0` |
| FR-04 | F-03 | 1 | AC-F03-01 | TEST-F03-01 | `server/tests/surveys.api.test.ts` | Pass | `v0.1.0` |
| FR-04 | F-03 | 1 | AC-F03-02 | TEST-F03-02 | `server/tests/surveys.api.test.ts` | Pass | `v0.1.0` |
| FR-05 | F-03 | 1(rev) | AC-F03-02 | UNIT-01 | `server/tests/unit/survey-rules.unit.test.ts` | Pass | Lab 7 branch |
| FR-10 | F-06 | 1 | AC-F06-05 | UNIT-02 | `server/tests/unit/survey-rules.unit.test.ts` | Pass | `v0.1.0` |
| FR-11 | F-07 | 1 | AC-F07-01 | UNIT-03 | `server/tests/unit/survey-rules.unit.test.ts` | Pass | `v0.1.0` |
| FR-11 | F-07 | 1 | AC-F07-01 | UI-04 | `client/tests/Summary.test.tsx` | Pass | `v0.1.0` |
| FR-06 | F-09 | 2 | AC-F09-01 | TEST-F09-01 | — | Not tested | Sprint 2 branch (PR #50, pending review) |
| FR-12 | F-10 | 2 | AC-F10-01 | TEST-F10-01 | — | Not tested | Sprint 2 branch (PR #50, pending review) |
| FR-09 | F-11 | 2 | AC-F11-01 | TEST-F11-01 | — | Not tested | Sprint 2 branch (PR #50, pending review) |
| FR-15 | F-12 | 2 | AC-F12-01 | UNIT-01 | `server/tests/unit/survey-rules.unit.test.ts` | Pass (updated) | Sprint 2 branch |
| FR-14 | F-14 | 2 | AC-F14-01 | TEST-F14-01 | — | Not tested | Sprint 2 branch (PR #50, pending review) |
| FR-18 | F-18 | 3 | AC-F18-01 | TEST-F18-01 | `server/tests/surveys.api.test.ts` | Pass | Sprint 3 branch |
| FR-18 | F-18 | 3 | AC-F18-03 | TEST-F18-02 | `server/tests/surveys.api.test.ts` | Pass | Sprint 3 branch |
| FR-13 | F-13 | 2→3 | — | — | — | Not implemented | — |
| FR-16 | F-16 | 3 | — | Planned | — | Not implemented | — |
| FR-17 | F-17 | 3 | — | Planned | — | Not implemented | — |

### D.3 Coverage gaps

| Requirement | Gap | Planned resolution |
|-------------|-----|-------------------|
| FR-06 (F-09) | No automated tests for manage drafts | Add API tests before Sprint 2 merge |
| FR-12 (F-10) | No automated tests for close survey | Add API tests before Sprint 2 merge |
| FR-09 (F-11) | No automated tests for my responses | Add API tests before Sprint 2 merge |
| FR-14 (F-14) | No automated tests for individual responses + CSV | Add API tests before Sprint 2 merge |
| FR-13 | Eligibility list not implemented | Sprint 3 (Eric, by 10 Dec) |
| FR-16 | Anonymous mode not implemented | Sprint 3 (Eric + Marc, by 8 Dec) |
| FR-17 | Date filter not implemented | Sprint 3 (Eric + Marc, by 10 Dec) |
| NFR (F-19) | No accessibility audit yet | Sprint 3 (axe-core scan, by 11 Dec) |

---

## Part E — Integrated release candidate (15 pts)

### E.1 Integrated behavior

The release candidate on main integrates:
- **Sprint 1:** F-01 to F-08 (authentication, role-based access, survey lifecycle, response submission, aggregate summary).
- **Sprint 2:** F-09 (manage drafts), F-10 (close survey), F-11 (my responses), F-12 (text questions), F-14 (individual responses + CSV). *(Pending merge of PR #50.)*
- **Lab 7 maintenance:** Rating scale 1–10. *(Pending merge of PR #49.)*
- **Sprint 3:** F-18 (duplicate survey). *(On `sprint3/features` branch.)*

### E.2 Automated test suite

| Package | Test files | Tests | Passed | Failed | Skipped |
|---------|-----------|-------|--------|--------|---------|
| Server (unit) | `survey-rules.unit.test.ts` | 12 | 12 | 0 | 0 |
| Server (API) | `surveys.api.test.ts`, `responses.api.test.ts`, `auth.api.test.ts` | ~15 | 15 | 0 | 0 |
| Client (UI) | `Summary.test.tsx`, `FillSurvey.test.tsx`, `Login.test.tsx`, `CreateSurvey.test.tsx` | 9 | 9 | 0 | 0 |

CI run `46026170860` (Sprint 2 branch, 27 Nov 2026): all tests passed.

### E.3 Deployment

| Item | Value |
|------|-------|
| GCP project | `cpe334-teamen040` |
| Cloud Run service | `cafe-feedback` |
| Region | `asia-southeast1` |
| Current revision | `cafe-feedback-00003-g6p` |
| Health check | `GET /api/version` → 200 |
| Deploy workflow | `.github/workflows/deploy.yml` (manual dispatch after merge to main) |

**Post-deployment verification:** After Marc merges PRs #49 and #50 and triggers the deploy workflow, we will:
1. Verify `GET /api/version` returns the new commit hash.
2. Sign in as Survey Owner, create a survey with a TEXT question and a 1–10 RATING question.
3. Publish, submit a response with rating 8 and a text answer.
4. Verify summary shows "X / 10" and 10 distribution rows, plus the text answer count.
5. Close the survey and duplicate it as a new draft.

### E.4 Completion plan (by 13 Dec 2026)

| Week | Work | Owner |
|------|------|-------|
| 29 Nov – 1 Dec | Marc merges PRs #48, #49, #50; deploy to GCP | Marc |
| 1–5 Dec | F-13 eligibility list (backend + frontend) | Eric |
| 1–5 Dec | F-16 anonymous mode (migration + backend) | Eric |
| 5–8 Dec | F-16 anonymous mode (frontend + duplicate guard) | Marc |
| 5–8 Dec | F-17 analysis filters (backend) | Eric |
| 8–10 Dec | F-17 analysis filters (frontend + chart) | Marc |
| 8–10 Dec | F-19 responsive + accessibility audit | Eric |
| 10–11 Dec | Final integration, regression, deploy | Both |
| 11–13 Dec | PD3 report and final video | Both |

### E.5 Setup summary

**Dependencies:** Node.js 20, PostgreSQL 15, npm 10.

**Build and run:**
```bash
npm install          # both packages
cd server && npx prisma migrate deploy  # run migrations
cd server && npm run dev                # backend on :4000
cd client && npm run dev                # frontend on :5173 (proxies /api to :4000)
```

**Docker:**
```bash
docker build -t cafe-feedback .
docker run -p 8080:8080 -e DATABASE_URL=... -e SESSION_SECRET=... cafe-feedback
```

**Test:**
```bash
cd server && npm test   # vitest
cd client && npm test   # vitest
```

Safe test accounts are provided through the private course handoff.

---

### Contributions

| Student | Work |
|---------|------|
| Eric Le Roux (69540460030) | Sprint 2 features (F-09, F-10, F-11, F-12, F-14), Sprint 3 F-18 implementation, all contracts, Lab 7 maintenance, test updates, report writing |
| Marc Stricker (69540460019) | PR review (pending), deployment, UAT participation |

### AI-use declaration

Claude (Anthropic) was used as a programming assistant for code generation, test writing,
and report drafting. All architectural decisions, feature design, and acceptance criteria
were defined by the students. The AI did not make scope or design decisions independently.

### Known limitations

- Sprint 2 features (PR #50) and Lab 7 maintenance (PR #49) are on branches awaiting Marc's review. The deployed revision does not yet include them.
- F-13 (eligibility list) and F-15 (performance/responsive) are deferred from Sprint 2 to Sprint 3.
- F-16, F-17 are planned but not implemented.
- The two Lab 6 UAT defects (#46, #47) are open; #46 has a fix ready.
