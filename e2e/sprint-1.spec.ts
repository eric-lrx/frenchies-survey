import { expect, test } from "@playwright/test";
import { ACCOUNTS, signIn, watchConsole } from "./helpers.js";

// Sprint 1 end-to-end journeys (docs/sprints/sprint-1/sts.md).

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
