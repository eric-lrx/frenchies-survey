# Three-sprint plan: Café Feedback

Version 0.1, 2026-11-05. Features are defined in `docs/features.md`.

| Sprint | Ends | Goal | Features | Completion outcome |
|---|---|---|---|---|
| 1 | 8 Nov (Deliverable 1) | A small working slice: sign in, create and publish a survey, answer it once, read the summary, with roles and tests | F-01 to F-08 | Release on `main` with documented setup, passing API, unit and end-to-end tests, and reviewed pull requests |
| 2 | 29 Nov (Deliverable 2) | Complete the core workflows | F-09 to F-15 | Drafts are editable, surveys can be closed, text questions, eligibility, individual responses and export work, performance and responsive targets pass, deployed through the Lab 5 pipeline |
| 3 | 13 Dec (Final) | Anonymous mode, richer analysis, and hardening | F-16 to F-19 | Anonymous mode with tested privacy separation, filters and trend, duplicate survey, failure handling and accessibility finished, final regression and deployment evidence |

By 29 November Sprint 3 must have its contracts, visible progress and an explicit list of remaining work.

## Dependencies

- F-08 (foundations) comes first: nothing can be tested without the repository, migration, seed and test
  harness.
- F-01, then F-02, then F-03 to F-07 in order. Each step needs the previous one, because ownership checks
  need sessions, and responses need published surveys.
- Sprint 2 features all build on F-06 (submit response) or F-03 and F-04 (survey creation and publication).
  F-09 and F-10 depend on the survey lifecycle, F-12 to F-14 on the answer model.
- F-16 (anonymous mode) needs F-14, because anonymity changes what the owner can see of a response. Its
  schema change needs a migration that keeps existing identified data valid.
- Lab 5 runs on the Sprint 1 release, between Sprints 1 and 2. Its pipeline then carries every later release.

## Scope of Sprint 1

Sprint 1 is exactly the example of theme 10 in the master specification: an owner logs in, creates and
publishes a small identified survey; an eligible respondent logs in, submits a validated response and sees
a confirmation; the owner reads an aggregate summary; repeat submissions and responses to unpublished or
closed surveys are rejected.

It is feasible in the time available because the scope is deliberately narrow:
- two question types (rating and single choice), all mandatory;
- no draft editing, no closing action, no individual response view, no eligibility list;
- seeded accounts only, with no registration or password reset;
- a closed survey is created by the seed, so that rejection of answers to a closed survey can be tested
  without the close feature.

Anything not listed in F-01 to F-08 is deferred in this plan, not dropped. Changes will be recorded in
`docs/traceability.md`, section 5.
