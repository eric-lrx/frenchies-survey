import { expect, type Page } from "@playwright/test";
import { config } from "dotenv";

// The seeded demo accounts share SEED_PASSWORD (server/.env). It is read here and never
// written into a test, a log or a screenshot.
config({ path: "server/.env", quiet: true });

export const ACCOUNTS = {
  owner: "camille@cafe.test",
  otherOwner: "lucas@cafe.test",
  alice: "alice@customer.test",
  bruno: "bruno@customer.test",
  chloe: "chloe@customer.test",
} as const;

function seedPassword(): string {
  const password = process.env.SEED_PASSWORD;
  if (!password) throw new Error("SEED_PASSWORD is missing from server/.env; run the setup in the README first.");
  return password;
}

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(seedPassword());
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

// Collects console errors and failed responses, so a test can assert there were none.
export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });
  return errors;
}
