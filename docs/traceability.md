# Traceability: requirements to features to sprints

Version 0.1, 2026-11-05. Sprint 1 rows give the planned acceptance criteria (`docs/features.md`, section 2)
and the tests named after them. Later sprints need an allocation now and get their criteria and tests in
their own contracts.

## 1. Functional requirements

| Requirement | Feature | Sprint | Verification |
|---|---|---|---|
| FR-01 | F-01 | 1 | AC-F01-01, AC-F01-02 / TEST-F01-01, TEST-F01-02 |
| FR-02 | F-01 | 1 | AC-F01-04 / TEST-F01-04, E2E-03 |
| FR-03 | F-01 | 1 | AC-F01-03 / TEST-F01-03 |
| FR-04 | F-03 | 1 | AC-F03-01, AC-F03-02, AC-F03-03 / TEST-F03-01 to 03, E2E-01 |
| FR-05 | F-03 | 1 | AC-F03-01, AC-F03-02 / TEST-F03-01, TEST-F03-02 |
| FR-06 | F-09 | 2 | Sprint 2 contract |
| FR-07 | F-04 | 1 | AC-F04-01 / TEST-F04-01, E2E-01 |
| FR-08 | F-05 | 1 | AC-F05-01, AC-F05-02 / TEST-F05-01, TEST-F05-02 |
| FR-09 | F-11 | 2 | Sprint 2 contract |
| FR-10 | F-06 | 1 | AC-F06-01 / TEST-F06-01, E2E-01, E2E-02 |
| FR-11 | F-07 | 1 | AC-F07-01 to 03 / TEST-F07-01 to 03, E2E-01 |
| FR-12 | F-10 | 2 | Sprint 2 contract |
| FR-13 | F-13 | 2 | Sprint 2 contract |
| FR-14 | F-14 | 2 | Sprint 2 contract |
| FR-15 | F-12 | 2 | Sprint 2 contract |
| FR-16 | F-16 | 3 | Sprint 3 contract |
| FR-17 | F-17 | 3 | Sprint 3 contract |
| FR-18 | F-18 | 3 | Sprint 3 contract |

## 2. Business rules

| Requirement | Feature | Sprint | Verification |
|---|---|---|---|
| BR-01 | F-02, F-07 | 1 | AC-F02-03 / TEST-F02-03 |
| BR-02 | F-04, F-10 | 1 (publish), 2 (close) | AC-F04-02 / TEST-F04-02; closing in Sprint 2 |
| BR-03 | F-04, F-09 | Established in 1, verified in 2 | Sprint 1 creation requires one question, so the rule can only be broken once drafts are editable (F-09); its test is in the Sprint 2 contract |
| BR-04 | F-09 | 2 | Sprint 1 has no route that edits a question; the rule is tested with F-09 |
| BR-05 | F-06 | 1 | AC-F06-03, AC-F06-04 / TEST-F06-03, TEST-F06-04 |
| BR-06 | F-06 | 1 | AC-F06-02, AC-F06-06 / TEST-F06-02, TEST-F06-06 |
| BR-07 | F-06 | 1 | AC-F06-05 / TEST-F06-05 |
| BR-08 | F-06 | 1 | AC-F06-05 / TEST-F06-05 |
| BR-09 | F-06 | 1 | AC-F06-07 / TEST-F06-07 |
| BR-10 | F-02, F-06 | 1 | AC-F02-02, AC-F02-04 / TEST-F02-02, TEST-F02-04 |
| BR-11 | F-07 | 1 | AC-F07-01, AC-F07-02 / TEST-F07-01, TEST-F07-02 |
| BR-12 | F-03 | 1 | AC-F03-02 / TEST-F03-02 |
| BR-13 | F-13 | 2 | Sprint 2 contract |
| BR-14 | F-16 | 3 | Sprint 3 contract |
| BR-15 | F-01 | 1 | AC-F01-04, AC-F01-06 / TEST-F01-04, TEST-F01-06 |

## 3. Non-functional requirements

| Requirement | Feature | Sprint | Verification |
|---|---|---|---|
| NFR-01 | F-01, F-02 | 1 | AC-F01-05 / TEST-F01-05 |
| NFR-02 | F-02 | 1 | AC-F02-01 to 04 / TEST-F02-01 to 04 |
| NFR-03 | F-01 | 1 | AC-F01-06 / TEST-F01-06 |
| NFR-04 | F-06 | 1 | AC-F06-06 / TEST-F06-06 |
| NFR-05 | F-08 | 1 | AC-F08-01, AC-F08-02 / TEST-F08-01, TEST-F08-02 |
| NFR-06 | F-15 | 2 | Sprint 2 contract (performance smoke test) |
| NFR-07 | F-15, F-19 | 2 and 3 | Sprint 2 and 3 contracts (responsive and keyboard tests) |
| NFR-08 | F-19 | Designed in 1, verified in Lab 5 | `.env.example` and the Lab 5 evidence (restart and redeploy) |
| NFR-09 | F-16 | 3 | Sprint 3 contract |

## 4. Coverage check

- Every requirement above (18 FR, 15 BR, 9 NFR) has a feature and a sprint. None is uncovered.
- Every Sprint 1 feature (F-01 to F-08) has planned acceptance criteria. Each Sprint 1 criterion has a test,
  and every requirement allocated to Sprint 1 has at least one of them.
- Two rules (BR-03, BR-04) cannot fail in Sprint 1 because no Sprint 1 route edits a draft. They are
  allocated to Sprint 2 on purpose, and the reason is recorded here instead of being left out.
- NFR-08 is verified by Lab 5, not by Sprint 1 tests.

## 5. Approved changes

None yet. Any change to scope or allocation will be added here with its date and reason.
