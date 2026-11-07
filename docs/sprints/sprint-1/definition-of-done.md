# Product Definition of Done: Sprint 1

The Sprint 1 release is done only when every box is ticked with evidence. An AI agent saying "it works" or
"all tests pass" is not evidence: the evidence is the test output, the commit, the pull request and the
screenshots.

## Behaviour
- [ ] Every Sprint 1 acceptance criterion (29, in the contracts of this folder) is implemented.
- [ ] The full journey works in a browser: an owner creates and publishes a survey, a respondent answers
      it, the owner reads the summary, and the saved result can be retrieved again.
- [ ] A business-rule rejection (repeat submission, closed survey) and a forbidden operation (wrong role,
      another owner's survey) are refused by the API, not only hidden in the UI.

## Verification
- [ ] `npm test` and `npm run e2e` pass on the release commit. The commands, the commit id and the passed,
      failed and skipped counts are recorded in `sts.md`, section 4.
- [ ] Every criterion in `sts.md` shows its actual test file and result.
- [ ] No required test is skipped, disabled or weakened to make the run pass. Any failing or skipped test
      is reported.
- [ ] For rule work, the test was committed and seen failing before the implementation, and both runs are
      kept with their commit ids.
- [ ] TEST-F08-01 (clean-clone setup) was followed by hand and its result recorded.

## Review and integration
- [ ] Each feature has an Issue, a branch from `staging`, and a pull request into `staging`.
- [ ] Each pull request was reviewed by the other team member, and the review states a specific check,
      question, finding or reason for approval. No author approved their own pull request.
- [ ] After all features were merged, the integration run passed on `staging`.
- [ ] A reviewed release pull request merged `staging` into `main`, and the release is tagged `v0.1.0`.

## Repository and documents
- [ ] The README gives the dependencies, the environment variables, the database setup, migration and
      seed, and the run, build and test commands.
- [ ] `.env.example` lists every variable with placeholders. No real secret, password or connection string
      is in Git, in a screenshot or in the PDF.
- [ ] The SRS, the features, the traceability table and the contracts match the released behaviour. Every
      contract change appears in its revision table.
- [ ] Known limitations and unfinished work are listed in the deliverable.

## Team
- [ ] Both members took part in specification, testing, implementation and review, shown by Issues,
      commits and pull request authorship and reviews, and summarised in a contribution table.
- [ ] Both members can explain the design, the tests and the released behaviour.
