# Lab 6 Part A: Sprint 1 UAT plan and handoff (Café Feedback)

Product Team: **Frenchies**, Eric Le Roux (69540460030) and Marc Stricker (69540460019).
This page is everything the UAT Team needs. No verbal explanation should be necessary: if a step is
unclear, report it as a finding (it is a defect of this plan).

## 1. Tested release

| Item | Value |
|---|---|
| Application | Café Feedback: a café owner creates surveys, customers answer them once, the owner reads the summary |
| Sprint 1 baseline | Tag `v0.1.0`, commit `1839e27` (Project Deliverable 1, 8 Nov 2026) |
| Tested release | `main` at `33bf12e` (release PR #36, 11 Nov 2026) |
| Deployed revision | Cloud Run service `cafe-feedback`, region `asia-southeast1`, revision: _filled in by the Product Team on the day of the handoff_ |
| URL | https://cafe-feedback-771479164263.asia-southeast1.run.app |
| Version check | Open `/api/version`: it must show `{"data":{"commit":"33bf12e8b9186c964e8dc176fcffb8097e3f6c99"}}`. If it shows anything else, stop and tell the Product Team: you are not on the tested release |
| Repository | https://github.com/eric-lrx/frenchies-survey |

**Why `33bf12e` and not `1839e27`.** The Sprint 1 features did not change between the two. The only
application code changed by Lab 5 is in `server/src/app.ts`, `config.ts` and `index.ts`: the server also
serves the built web page, trusts the Cloud Run proxy, answers `/api/version`, and shuts down cleanly. The
Sprint 1 behaviour under test is the same.

**No deployment during testing.** The Product Team will not deploy anything between the start of the
UAT session and the end of the re-test without telling the UAT Team first. A corrected release gets its own
commit and its own `/api/version` value.

## 2. Accepted-for-test scope (Sprint 1 only)

The Sprint 1 contracts are in `docs/sprints/sprint-1/` (features F-01 to F-08, 29 acceptance criteria).
In scope:

| Feature | What a user can do |
|---|---|
| F-01 Authentication | Sign in with email and password, see their name and role, sign out |
| F-02 Roles and ownership | An owner sees only owner pages and their own surveys; a respondent sees only respondent pages and their own responses |
| F-03 Create survey | An owner creates a survey (title, optional description, 1 to 20 questions, each a 1 to 5 rating or a single choice with 2 to 6 options), saved as DRAFT |
| F-04 Publish survey | An owner publishes their own DRAFT; it cannot be unpublished |
| F-05 Browse open surveys | A respondent sees the PUBLISHED surveys only |
| F-06 Submit response | A respondent answers every question once; a second answer is refused |
| F-07 Aggregate summary | An owner reads the response count, rating averages and option counts of their own survey |

**Not in Sprint 1 (do not report as defects, they are Sprint 2 or 3):** editing a draft, closing a survey
from the screen, text questions, eligibility rules, individual responses for the owner, export, changing a
password, creating accounts, a respondent's history page, login rate limiting. Report one as an
enhancement if you think it matters.

**Known Sprint 1 limitations** (already documented in Project Deliverable 1): no limit on failed sign-in
attempts; expired sessions are refused but not deleted from the database.

## 3. Accounts

All accounts are synthetic. **The password is not in this document.** The Product Team sends it privately
(course chat or e-mail to the two UAT testers). Every account below uses the same password.

| Label | E-mail | Role | Seeded data |
|---|---|---|---|
| OWNER-A | `camille@cafe.test` (Camille Martin) | Survey Owner | Owns "Spring menu feedback" (PUBLISHED), "Terrace opening" (DRAFT), "Winter drinks" (CLOSED) |
| OWNER-B | `lucas@cafe.test` (Lucas Bernard) | Survey Owner | Owns "Barista service" (PUBLISHED) |
| RESP-A | `alice@customer.test` (Alice Dupont) | Respondent | |
| RESP-B | `bruno@customer.test` (Bruno Petit) | Respondent | |
| RESP-C | `chloe@customer.test` (Chloé Moreau) | Respondent | |

The live database already contains surveys and responses from earlier checks (for example "Test C-05
before release"). They do not affect the cases below, because every case creates its own survey with a
unique title.

## 4. Data setup, sequence and cleanup

- **Unique titles.** Wherever a case says `<TAG>`, use your team name, your initials and the time, for
  example `UAT-01 Team X JD 14:05`. Two testers can then run the same case without touching each other's
  data.
- **One browser window per account.** Sign out before you switch account, or use one normal window and
  one private window. Do not use two accounts in two tabs of the same window: they share the session
  cookie.
- **Order.** UAT-01 first (it creates the survey that UAT-03 and UAT-05 use). The other cases are
  independent and can run in any order.
- **Respondents answer once per survey.** That is a rule under test. If a case needs a fresh respondent
  answer, it creates a new survey first.
- **Cleanup.** There is no delete in Sprint 1, so nothing needs to be cleaned up. Test surveys stay in the
  owner's list with their `<TAG>` title. If the data becomes unusable, the Product Team can re-seed: tell
  them, do not try to fix it yourself.
- **Time zone.** Dates on screen are in Asia/Bangkok (UTC+7).

## 5. Recording results

For each case record: case ID, tester name and team, date and time (UTC+7), the `/api/version` value, the
inputs you actually used, the **actual result in your own words**, and PASS, FAIL or BLOCKED. BLOCKED means
you could not run the case (say why); it is not a pass. Take at least one screenshot per case, showing the
URL bar, the signed-in name and the result.

Report every FAIL as a GitHub Issue on https://github.com/eric-lrx/frenchies-survey/issues with the label
`lab6-uat`, using the template in section 7. If you cannot open an Issue, send the same text to the
Product Team and they will open it for you with your name as reporter.

## 6. Test cases

Every case below starts signed out on the URL of section 1. The screen shows a survey's status as a
badge: "Draft", "Published" or "Closed" (DRAFT, PUBLISHED and CLOSED in the contracts).

### UAT-01 Normal journey: create, publish, answer, read the summary

| | |
|---|---|
| Category | Normal domain journey |
| Requirements | AC-F03-01, AC-F04-01, AC-F05-01, AC-F06-01, AC-F07-01 (FR-04, FR-07, FR-08, FR-10, FR-11, BR-11) |
| Purpose | The main Sprint 1 journey works end to end and the summary figures are right |
| Roles | OWNER-A, RESP-A, RESP-B, RESP-C |
| Preconditions | None |

**Inputs.** Title `UAT-01 <TAG>`, description `Sprint 1 acceptance test.` Question 1: `How good was your
coffee?`, type Rating (1 to 5). Question 2: `What did you drink?`, type Single choice, options `Latte`,
`Iced tea`, `Espresso`.

| Step | Action | Expected result |
|---|---|---|
| 1 | Sign in as OWNER-A | The page "My surveys" opens; the header shows "Camille Martin" and a "Sign out" button |
| 2 | Click "New survey", fill in the inputs above (use "Add question" for question 2 and "Add option" for the third option), click "Save draft" | The survey detail page opens with the title, the description, status **Draft**, and the two questions with the three options in the order typed |
| 3 | Click "Publish", read the dialog, click "Publish" in the dialog | The dialog says "Once published, respondents can answer and the questions can no longer be changed." After confirming: the message "The survey is published. Respondents can now answer it.", status **Published**, and no "Publish" button anymore |
| 4 | Sign out. Sign in as RESP-A | The page "Open surveys" opens. A card `UAT-01 <TAG>` shows "2 questions" and an "Answer" button |
| 5 | Open the survey. Choose rating **5** and **Latte**. Click "Submit" | A page "Thank you, your response was recorded" shows the survey title, the date and time, and the answers "5 / 5" and Latte |
| 6 | Sign out. As RESP-B, answer the same survey with rating **4** and **Espresso** | Same confirmation page with 4 and Espresso |
| 7 | Sign out. As RESP-C, answer the same survey with rating **4** and **Latte** | Same confirmation page with 4 and Latte |
| 8 | Sign out. Sign in as OWNER-A, open `UAT-01 <TAG>` from "My surveys", open its results | "My surveys" shows 3 in the Responses column. The results page shows **"3 responses"**; question 1: **Average 4.3 / 5** (5 + 4 + 4 = 13, 13 ÷ 3 = 4.33, rounded to one decimal), counts 1: 0, 2: 0, 3: 0, 4: 2, 5: 1; question 2: **Latte 2 (67%), Iced tea 0 (0%), Espresso 1 (33%)** |

### UAT-02 Business rules: survey validation boundaries

| | |
|---|---|
| Category | Business rule and boundary |
| Requirements | AC-F03-02, AC-F03-01 (FR-05, BR-12) |
| Purpose | Invalid surveys are refused with a message next to each problem and nothing is saved; values exactly on a limit are accepted |
| Roles | OWNER-A |
| Preconditions | Note the number of surveys in OWNER-A's "My surveys" list (call it N) |

| Step | Action | Expected result |
|---|---|---|
| 1 | Sign in as OWNER-A, click "New survey". Title `Hi` (2 characters). Question 1 text `Taste?`, type Single choice, options `Latte` and `latte`. Click "Save draft" | No new page. Next to the title: "Must be 3 to 120 characters". Next to the options: "Options must be different". The values you typed are still in the form |
| 2 | Change the second option to `Mocha`, then click "Remove" on it so that only `Latte` is left. Click "Save draft" | Next to the options: "A choice question needs 2 to 6 options". The title message is still shown |
| 3 | Open "My surveys" | Still N surveys: nothing was saved by steps 1 and 2 |
| 4 | Click "New survey". Title `Tea` (exactly 3 characters). Question 1 text `Hot?` type Rating. Click "Save draft" | The survey is saved: detail page with title `Tea`, status Draft, one rating question |
| 5 | Open "My surveys" | N + 1 surveys; the new one is `Tea`, Draft, 1 question, 0 responses |

### UAT-03 Business rule: one response per respondent

| | |
|---|---|
| Category | Business rule (and concurrency at the screen level) |
| Requirements | AC-F06-02, AC-F05-01 (BR-06) |
| Purpose | A respondent cannot answer the same survey twice, even from a form opened twice |
| Roles | OWNER-A, RESP-A |
| Preconditions | UAT-01 done (RESP-A has answered `UAT-01 <TAG>`). For step 3 a new survey `UAT-03 <TAG>` created and published by OWNER-A, with one rating question `Clean tables?` |

| Step | Action | Expected result |
|---|---|---|
| 1 | Sign in as RESP-A and open "Open surveys" | `UAT-01 <TAG>` shows an "Answered" badge instead of the "Answer" button |
| 2 | Type the survey's address directly (`/surveys/<id>`, the id is in the address bar of the confirmation page from UAT-01, or of the owner's detail page) | The page shows "You have already answered this survey." and a link back, and no form |
| 3 | Open `UAT-03 <TAG>` in **two tabs of the same window**. In tab 1 choose 3 and click "Submit" | Tab 1: the confirmation page |
| 4 | In tab 2 (still showing the form) choose 5 and click "Submit" | Tab 2 shows "You have already answered this survey." with a link back to "Open surveys". No second confirmation page |
| 5 | Sign out, sign in as OWNER-A, open the results of `UAT-03 <TAG>` | **"1 response"**, average **3.0 / 5**: the second answer (5) was not stored |

### UAT-04 Forbidden role and ownership

| | |
|---|---|
| Category | Forbidden role and ownership |
| Requirements | AC-F02-01, AC-F02-02, AC-F02-03, AC-F02-04, AC-F01-04 (BR-01, BR-10) |
| Purpose | A user cannot see or change what belongs to another role or another owner, and protected data is not shown or changed |
| Roles | OWNER-A, OWNER-B, RESP-A, RESP-B |
| Preconditions | A survey `UAT-04 <TAG>` created by OWNER-A and **left in DRAFT** (one rating question `Fast service?`). Write down its address `/owner/surveys/<id>` and the address `/owner/surveys/<id>/summary`. A response of RESP-A: write down the address `/responses/<id>` of the confirmation page from UAT-01 step 5 |

| Step | Action | Expected result |
|---|---|---|
| 1 | Sign in as OWNER-B. Type the address `/owner/surveys/<id>` of `UAT-04 <TAG>` | "This survey does not exist or is not yours." No title, no question, no "Publish" button |
| 2 | Still as OWNER-B, type `/owner/surveys/<id>/summary` | "This survey does not exist or is not yours." No figures |
| 3 | Still as OWNER-B, open "My surveys" | Only "Barista service" and any survey OWNER-B created; `UAT-04 <TAG>` is not listed |
| 4 | Sign out, sign in as RESP-A. Type `/owner/surveys` in the address bar | You are sent back to "Open surveys"; the navigation shows only "Open surveys" |
| 5 | Still as RESP-A, look for `UAT-04 <TAG>` in "Open surveys", then type `/surveys/<id>` with the id of `UAT-04 <TAG>` | It is not listed (it is a DRAFT), and the page says "This survey is not available." |
| 6 | Sign out, sign in as RESP-B. Type RESP-A's address `/responses/<id>` | "This response is not available." None of RESP-A's answers are shown |
| 7 | Click "Sign out", then press the browser's Back button | The sign-in page stays; no survey or response data appears |
| 8 | Sign in as OWNER-A and open `UAT-04 <TAG>` | It is still **Draft**, with its question unchanged: nothing above changed it |

### UAT-05 State and persistence: published, closed and stored responses

| | |
|---|---|
| Category | State, history and persistence |
| Requirements | AC-F04-02, AC-F05-01, AC-F05-02, AC-F06-01, AC-F06-04 (BR-02, BR-05, NFR-04) |
| Purpose | A survey's status decides who sees it, a CLOSED survey cannot be answered, and a stored response stays the same after signing out and in again |
| Roles | OWNER-A, RESP-C |
| Preconditions | UAT-01 done |

| Step | Action | Expected result |
|---|---|---|
| 1 | Sign in as OWNER-A. In "My surveys", note the address `/owner/surveys/<id>` of "Winter drinks" (CLOSED) and of "Terrace opening" (DRAFT). Open `UAT-01 <TAG>` | `UAT-01 <TAG>` is Published and has no "Publish" button (a published survey cannot be published again). "Winter drinks" shows status Closed and no "Publish" button |
| 2 | Sign out, sign in as RESP-C. Open "Open surveys" | "Spring menu feedback", "Barista service" and `UAT-01 <TAG>` are listed (the last one with "Answered"). "Winter drinks" (CLOSED) and "Terrace opening" (DRAFT) are **not** listed |
| 3 | Type `/surveys/<id>` with the id of "Winter drinks", then with the id of "Terrace opening" | Both pages say "This survey is not available." No question is shown, so nothing can be submitted |
| 4 | Open `UAT-01 <TAG>` from the list | "You have already answered this survey." |
| 5 | Note the address of RESP-C's confirmation page for `UAT-01 <TAG>` (from UAT-01 step 7). Sign out. Close the browser window. Open a new window, sign in as RESP-C again and type that address | The confirmation page shows the same answers as in UAT-01: "4 / 5" and Latte, with the same date and time |

### UAT-06 Authentication

| | |
|---|---|
| Category | Forbidden access (sign-in) |
| Requirements | AC-F01-01, AC-F01-02, AC-F01-04, AC-F01-05 (FR-01, FR-02, FR-03, BR-15) |
| Purpose | Sign-in works with the right password, and a failed sign-in does not say whether the e-mail exists |
| Roles | RESP-A |
| Preconditions | Signed out |

| Step | Action | Expected result |
|---|---|---|
| 1 | Sign in as `alice@customer.test` with the password `wrong-password-1` | The message "Email or password is incorrect." The e-mail stays in the field. The "Sign in" button can be used again |
| 2 | Sign in as `nobody@customer.test` with the password `wrong-password-1` | Exactly the same message as in step 1 |
| 3 | Without signing in, type the address `/owner/surveys`, then `/surveys` | Each time the sign-in page is shown; no survey data appears |
| 4 | Sign in as RESP-A with the right password | "Open surveys" opens; the header shows "Alice Dupont" |
| 5 | Click "Sign out" | The sign-in page is shown. Typing `/surveys` again shows the sign-in page |

## 7. Defect report template

```
Title: [UAT-xx] short description of what is wrong
Reporter: name, team
Tested version: value of /api/version, date and time (UTC+7)
Case and requirement: UAT-xx step n, AC-...
Preconditions and data: account label (never the password), survey title
Steps to reproduce: 1. ... 2. ...
Expected result: (copy from the case)
Actual result: (what you saw)
Severity proposed by the reporter: Critical, Major, Minor or Trivial (see below)
Evidence: screenshot or screen text
```

| Severity | Meaning for a user of Café Feedback |
|---|---|
| Critical | Data of another user is shown or changed, a stored response is lost or wrong, or the main journey cannot be completed |
| Major | A Sprint 1 acceptance criterion fails, with no workaround (for example a wrong summary figure, or a rule not applied) |
| Minor | The criterion is met but something is wrong or confusing, with a workaround (for example a misleading message) |
| Trivial | Cosmetic (typo, alignment) |

Critical and Major defects block acceptance. Minor and Trivial defects are fixed or accepted by the UAT
Team as documented limitations.

## 8. Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-19 | First version. Checked by the Product Team before the handoff: every step was run in a browser on a local copy of the tested code (`staging` 9b71d5b, the same tree as `33bf12e`) with fresh seed data, and every expected result matched (41 checks). The status labels were corrected to the screen text ("Draft", not "DRAFT") during that check. This is a check of the plan, not the independent UAT |
