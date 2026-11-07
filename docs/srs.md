# Software Requirements Specification: Café Feedback

| | |
|---|---|
| Product | Café Feedback (theme 10, Review, Feedback, and Survey System) |
| Team | Frenchies: Eric Le Roux (69540460030, @eric-lrx) and Marc (69540460019, @marcoumarc) |
| Version | 0.1, 2026-11-05 |
| Status | Baseline for Sprint 1; later sprints may add justified revisions (section 8) |

## 1. Stakeholder problem and context

A single independent café wants to know what its customers think. Today it collects remarks on paper
slips and by word of mouth, so nothing is counted, nobody can tell whether the same customer answered
twice, and the owner cannot compare one menu change with the next.

The café manager needs to build a short survey ("Spring menu feedback"), publish it to registered
customers, collect one validated answer per customer, and read the results as numbers (how many answered,
the average rating, how many chose each option). Customers need a simple way to find open surveys and
answer them once.

The product is an identified-survey system first: the café knows which registered customer answered.
Anonymous responses are a later addition and need a separate privacy design (BR-14).

## 2. Actors

| Actor | Who | Responsibilities |
|---|---|---|
| Survey Owner | The café manager (one account per owner) | Creates, publishes and (later) closes their own surveys; reads the results of their own surveys only |
| Respondent | A registered café customer | Lists open surveys, submits at most one response per survey, sees their own response |
| Visitor | Anyone who is not signed in | Can only see the login screen; no survey or response data |

Each account has exactly one role (D-03). Accounts are seeded in Sprint 1; there is no self-registration.

## 3. Scope

**Included across the three sprints:** login, logout and current user; role-based access with ownership;
survey lifecycle DRAFT, PUBLISHED, CLOSED; rating, single-choice and short-text questions; one response
per respondent per survey; aggregate results; eligibility list; individual responses and CSV export for
identified surveys; anonymous mode with identity and answer separation; date filtering and trend charts;
usability, accessibility and failure handling.

**Excluded (explicitly):** self-registration, password recovery, email or SMS invitations and
notifications, public surveys that need no login, payments or loyalty-card integration, several cafés or
organisations in one installation, languages other than English, editing or deleting a submitted
response, multiple-choice (several answers) questions, and any external analytics service.

## 4. Functional requirements

| ID | Requirement | Sprint |
|---|---|---|
| FR-01 | A user signs in with email and password. A wrong password and an unknown email give the same generic failure. | 1 |
| FR-02 | A signed-in user signs out, and the old session can no longer be used. | 1 |
| FR-03 | The signed-in user's name and role can be retrieved. | 1 |
| FR-04 | A Survey Owner creates a survey in DRAFT with a title, an optional description and at least one question. | 1 |
| FR-05 | A question is either a rating (integer 1 to 5) or a single choice among 2 to 6 options. | 1 |
| FR-06 | A Survey Owner edits or deletes the questions of their own DRAFT surveys. | 2 |
| FR-07 | A Survey Owner publishes their own DRAFT survey. | 1 |
| FR-08 | A Respondent lists the PUBLISHED surveys and opens one to answer it. | 1 |
| FR-09 | A Respondent lists the surveys they already answered and re-reads their own responses. | 2 |
| FR-10 | A Respondent submits one validated response to a PUBLISHED survey and sees a confirmation. | 1 |
| FR-11 | A Survey Owner reads the aggregate summary of their own survey: response count, rating average and distribution, count per choice. | 1 |
| FR-12 | A Survey Owner closes their own PUBLISHED survey. | 2 |
| FR-13 | A Survey Owner restricts a survey to an eligibility list of respondents. | 2 |
| FR-14 | A Survey Owner reads individual responses of an identified survey and exports them as CSV. | 2 |
| FR-15 | A question can be a short text answer. | 2 |
| FR-16 | A Survey Owner publishes a survey in anonymous mode, where answers are stored without a link to the respondent. | 3 |
| FR-17 | A Survey Owner filters results by date range and sees responses per day. | 3 |
| FR-18 | A Survey Owner duplicates a closed survey as a new DRAFT. | 3 |

## 5. Business rules

| ID | Rule |
|---|---|
| BR-01 | A survey has exactly one owner. Only that owner can read it in full, modify it, publish it, or see its results. |
| BR-02 | A survey moves only DRAFT to PUBLISHED to CLOSED. Any other transition is rejected. |
| BR-03 | A survey needs at least one question to be published. |
| BR-04 | Questions and options cannot change once the survey is PUBLISHED, so that results stay meaningful. |
| BR-05 | Responses are accepted only while the survey is PUBLISHED. |
| BR-06 | One respondent has at most one response per survey. The database enforces it, so two simultaneous submissions cannot both succeed. |
| BR-07 | A response must answer every question of the survey. |
| BR-08 | A rating answer is an integer from 1 to 5. A choice answer is one of that question's own options. An answer cannot target a question of another survey. |
| BR-09 | A submitted response cannot be changed or deleted by its respondent. |
| BR-10 | A Respondent never sees another respondent's answers. A Survey Owner cannot submit a response (one role per account). |
| BR-11 | Averages are computed from stored answers and rounded to one decimal. With zero responses the count is 0 and the averages are empty, not 0. |
| BR-12 | Survey title is 3 to 120 characters, question text 3 to 200, an option 1 to 60 and unique within its question. |
| BR-13 | When an eligibility list exists, only the listed respondents can submit. Without a list, every respondent can. |
| BR-14 | In anonymous mode no stored answer links to a user. Whether a user has responded is tracked separately. A survey that identifies respondents is never labelled anonymous. The mode cannot change after publication. |
| BR-15 | Passwords are stored only as salted hashes. A session expires after 8 hours, and logout revokes it on the server. |

## 6. Non-functional requirements

| ID | Requirement and measurable target | Verification | Sprint |
|---|---|---|---|
| NFR-01 | Every protected endpoint rejects a request without a valid session with 401 and no private data in the body. | API test that calls every protected route without a session | 1 |
| NFR-02 | Role and ownership rules are enforced by the backend: wrong role gives 403, another user's resource gives 404. | API tests per role and per ownership case | 1 |
| NFR-03 | No plaintext password is stored: every stored password is a bcrypt hash with cost of at least 10. | Database inspection test | 1 |
| NFR-04 | Two simultaneous submissions by the same respondent store exactly one response. | Integration test with parallel requests | 1 |
| NFR-05 | A clean clone runs after at most 10 documented commands (install, configure, migrate, seed, start, test). | Follow the README on a clean clone | 1 |
| NFR-06 | The summary of a survey with 1,000 responses answers in 300 ms or less (median of 5 local runs). | Performance smoke test | 2 |
| NFR-07 | No horizontal scrolling at 375, 768 and 1280 px. Every form control has a label and works with the keyboard. | Playwright responsive and keyboard tests | 2 to 3 |
| NFR-08 | All configuration comes from environment variables, no secret is committed, and data survives a restart and a redeploy. | `.env.example` review, Lab 5 evidence | 1 (design), Lab 5 |
| NFR-09 | In anonymous mode no query or table joins an answer to a user. | Schema and API test | 3 |

## 7. Assumptions, decisions and questions

| ID | Decision or assumption | Reason |
|---|---|---|
| D-01 | Same stack as TokTickIT: React, Express, Prisma, PostgreSQL. | The master specification encourages it, and it matches the Lab 5 starter kit. |
| D-02 | One café; a manager is the Survey Owner and customers are Respondents. | Smallest context that gives two real roles. |
| D-03 | One role per account; seeded accounts only. | Master specification, section 5.2. |
| D-04 | Sessions are stored in the database, not in memory. | The service may run several instances on Cloud Run, and a restart must not undo a logout. |
| D-05 | Sprint 1 has two question types (rating, single choice). Text comes in Sprint 2. | Enough for a meaningful aggregate summary. |
| D-06 | Sprint 1 shows aggregates only. Individual responses come in Sprint 2. | Keeps raw data access a deliberate later decision. |
| D-07 | A Survey Owner cannot answer surveys. | Avoids biased results. |
| D-08 | Dates are stored in UTC and shown in Asia/Bangkok. | Users are in Thailand. |
| D-09 | A submitted response is final. | A correction would break the one-response rule and the averages. |
| D-10 | Every question is mandatory in Sprint 1. | Removes partial-answer cases from the first slice. |
| D-11 | Publishing cannot be undone. | BR-04 depends on it. |
| D-12 | Anonymous mode is deferred to Sprint 3, as the master specification suggests. | It needs its own privacy design (BR-14). |
| D-13 | The eligibility list is a list of respondent accounts. | Fits identified surveys and needs no email service. |
| Q-01 | Is an alternative Sprint 1 slice needed? Resolved: no, the example of theme 10 is followed as written. | Master specification, section 6. |

## 8. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-11-05 | First baseline | Project Deliverable 1 |
