import { expect, test } from "@playwright/test";
import { ACCOUNTS, signIn, watchConsole } from "./helpers.js";

// Sprint 1 end-to-end journeys (docs/sprints/sprint-1/sts.md).

test("E2E-01 an owner creates and publishes a survey, a respondent answers it, the owner reads the summary", async ({ browser }) => {
  const title = `Brunch feedback ${Date.now()}`;

  // Camille, the café manager, creates and publishes the survey.
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const ownerErrors = watchConsole(owner);
  await signIn(owner, ACCOUNTS.owner);
  await owner.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "New survey" }).click();
  await owner.getByLabel(/^Title/).fill(title);
  await owner.getByLabel("Question 1 text").fill("How would you rate the brunch?");
  await owner.getByRole("button", { name: "Add question" }).click();
  await owner.getByLabel("Question 2 text").fill("Which drink did you have?");
  await owner.getByLabel("Question 2 type").selectOption("CHOICE");
  await owner.getByLabel("Question 2, option 1").fill("Latte");
  await owner.getByLabel("Question 2, option 2").fill("Orange juice");
  await owner.getByRole("button", { name: "Save draft" }).click();
  await expect(owner.getByRole("heading", { name: title })).toBeVisible();
  await expect(owner.locator(".status-badge")).toHaveText("Draft");
  await owner.getByRole("button", { name: "Publish" }).click();
  await owner.getByRole("dialog").getByRole("button", { name: "Publish" }).click();
  await expect(owner.locator(".status-badge")).toHaveText("Published");
  const surveyPath = new URL(owner.url()).pathname;

  // Alice, a customer, finds it, answers 4 and Latte, and sees the confirmation.
  const respondentContext = await browser.newContext();
  const alice = await respondentContext.newPage();
  const aliceErrors = watchConsole(alice);
  await signIn(alice, ACCOUNTS.alice);
  await alice.getByRole("link", { name: `Answer ${title}` }).click();
  await alice.getByRole("group", { name: "How would you rate the brunch?" }).getByLabel("4").check();
  await alice.getByLabel("Latte").check();
  await alice.getByRole("button", { name: "Submit" }).click();
  await expect(alice.getByRole("heading", { name: "Thank you, your response was recorded" })).toBeVisible();
  await expect(alice.getByText("4 / 5")).toBeVisible();

  // Camille reads the summary: one response, average 4.0, Latte chosen once.
  await owner.goto(`${surveyPath}/summary`);
  await expect(owner.getByText("1 response", { exact: true })).toBeVisible();
  await expect(owner.getByText("4.0 / 5")).toBeVisible();
  const choices = owner.getByRole("table", { name: "Which drink did you have?" });
  await expect(choices.getByRole("row", { name: /Latte/ })).toContainText("1");
  await expect(choices.getByRole("row", { name: /Orange juice/ })).toContainText("0");

  expect(ownerErrors, ownerErrors.join("\n")).toEqual([]);
  expect(aliceErrors, aliceErrors.join("\n")).toEqual([]);
  await ownerContext.close();
  await respondentContext.close();
});

test("E2E-03 a respondent cannot reach owner screens, and a signed-out session cannot go back in", async ({ page }) => {
  const errors = watchConsole(page);
  await signIn(page, ACCOUNTS.alice);
  await expect(page).toHaveURL(/\/surveys$/);

  // Only the respondent's navigation is shown.
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Open surveys" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "My surveys" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "New survey" })).toHaveCount(0);

  // An owner screen typed in the address bar sends the respondent back to their own home.
  await page.goto("/owner/surveys");
  await expect(page).toHaveURL(/\/surveys$/);
  await expect(page.getByRole("heading", { name: "Open surveys" })).toBeVisible();

  // After sign-out, Back does not return into the application.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("E2E-02 a repeat submission is refused: a respondent who answered sees no form, only a clear message", async ({ page }) => {
  const errors = watchConsole(page);
  // In the seed, Alice has already answered "Spring menu feedback".
  await signIn(page, ACCOUNTS.alice);
  const card = page.getByRole("listitem").filter({ hasText: "Spring menu feedback" });
  await expect(card.getByText("Answered")).toBeVisible();
  await expect(card.getByRole("link", { name: /^Answer/ })).toHaveCount(0);

  // Opening it by its address does not offer the form again.
  const [{ id }] = await (await page.request.get("/api/open-surveys")).json().then((r) =>
    r.data.filter((s: { title: string }) => s.title === "Spring menu feedback"),
  );
  await page.goto(`/surveys/${id}`);
  await expect(page.getByText("You have already answered this survey.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to open surveys" })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("a survey owner sees only the owner navigation", async ({ page }) => {
  await signIn(page, ACCOUNTS.owner);
  await expect(page).toHaveURL(/\/owner\/surveys$/);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "My surveys" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "New survey" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Open surveys" })).toHaveCount(0);

  await page.goto("/surveys");
  await expect(page).toHaveURL(/\/owner\/surveys$/);
});
