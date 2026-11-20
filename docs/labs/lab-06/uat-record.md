# Lab 6 UAT record (team Frenchies)

This page holds the facts that go into the Lab 6 PDF. It is filled in as the work happens; an empty row
means "not done yet", never "passed". Real results only: a BLOCKED or Not Accepted result is recorded as
such.

## 1. Teams

| Role | Team | Students | Application |
|---|---|---|---|
| Product Team (our app) | Frenchies | Eric Le Roux (69540460030), Marc Stricker (69540460019) | Café Feedback |
| UAT Team for our app | _to fill_ | _names and IDs_ | |
| Product Team we test | _to fill_ | _names and IDs_ | _their app_ |

Partner agreement: date, channel and link to the message: _to fill_.

## 2. Version table

| Item | Commit | Where it is recorded |
|---|---|---|
| Sprint 1 baseline | `v0.1.0` = `1839e27` | tag, Project Deliverable 1 |
| Tested release (handed to the UAT Team) | `33bf12e` | `/api/version`, release PR #36, Deploy run 42956016512 |
| Cloud Run revision tested | `cafe-feedback-00003-g6p` (read by Marc on 2026-11-19) | `gcloud run services describe cafe-feedback --region asia-southeast1 --project cpe334-teamen040 --format='value(status.latestReadyRevisionName)'` |
| Defective commit(s) | _per accepted defect, or "none"_ | |
| Regression test commit (RED) | | |
| Fix commit (GREEN) | | |
| Corrected release on `main` | | release PR, Deploy run |
| Corrected deployed revision | | `/api/version`, revision name |

`33bf12e` differs from `1839e27` only by the Lab 5 cloud changes (`server/src/app.ts`, `config.ts`,
`index.ts`); no Sprint 1 behaviour changed. See `uat-plan.md` section 1.

## 3. Part A: handoff log

| Date and time (UTC+7) | What was sent | To | Channel |
|---|---|---|---|
| | `uat-plan.md` link and tested version | UAT Team | |
| | Password of the test accounts (privately, never in Git or the PDF) | the two UAT testers | |

## 4. Part B: our execution of the other team's cases

One row per case and per tester. The actual result is written in our own words, never copied from their
expected result.

| Case | Tester | Date and time | Tested version | Inputs used | Actual result | Result | Evidence |
|---|---|---|---|---|---|---|---|
| | Eric | | | | | PASS / FAIL / BLOCKED | E-B-01 |
| | Marc | | | | | | |

Outgoing findings (reported to the other team):

| Issue (their repo) | Case | Severity proposed | Summary | Their disposition | Re-test result |
|---|---|---|---|---|---|
| | | | | | |

## 5. Part C: findings received on Café Feedback

Every finding the UAT Team reports, including "none" if there are none.

| Finding | Reporter | Case | Classification | Reason (tied to the Sprint 1 contract and evidence) | Severity | Owner | Status |
|---|---|---|---|---|---|---|---|
| | | | Accepted defect / Duplicate of #n / Not a defect / Enhancement | | Critical / Major / Minor / Trivial | | |

Rules we apply: a report is reproduced before it is dismissed; a failing Sprint 1 criterion is never
relabelled as an enhancement; Critical and Major defects block acceptance and are fixed and re-tested; a
Minor defect is fixed or accepted by the UAT Team as a known limitation.

## 6. Part D: correction chain (one block per accepted defect)

| Step | Evidence |
|---|---|
| Issue | `#n`, label `lab6-uat` |
| Branch | `fix/uat-<n>-<short>` from `staging` |
| RED | test name, file, command, commit, output showing the failure |
| GREEN | same test passing, commit of the fix, command, output, plus the full suite (`npm test`, `npm run e2e`) |
| Review | PR into `staging`, reviewed by the other team member (not the author) |
| Release | release PR `staging` to `main`, reviewed; Deploy run; `/api/version` shows the new commit |
| Smoke check | `/api/health`, `/api/ready`, `/api/version` after the deploy |
| Partner informed | date and message before the deploy |
| Independent re-test | UAT tester, date, version, actual result, evidence |

**If the UAT Team finds no legitimate defect**, we do not invent one. We ask the instructor or TA for a
controlled defect exercise on an isolated branch (handout section 3.5), run the same chain on it, and keep
it apart from the accepted release.

## 7. Final Sprint 1 decision (written by the UAT Team, not by us)

| Item | Value |
|---|---|
| Decision | Accepted / Accepted with documented minor limitations / Not Accepted |
| Release tested | commit and Cloud Run revision |
| Testers | names, team |
| Date | |
| Conditions and limitations | |
| Evidence | message or Issue comment from the UAT Team, quoted in the PDF |

## 8. Contributions, AI use, limitations

| Work | Eric | Marc |
|---|---|---|
| UAT plan (Part A) | | |
| Executing the partner's cases (Part B) | | |
| Triage (Part C) | | |
| Fixes, review, release (Part D) | | |

AI use: _what an AI assistant produced and how it was checked_. Limitations: _to fill_.
