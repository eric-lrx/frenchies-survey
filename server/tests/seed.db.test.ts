import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma.js";
import { seedDatabase } from "../src/seed.js";
import { resetDatabase, tableCounts } from "./helpers/db.js";

// A test value only: the real demo password comes from SEED_PASSWORD and never appears in code.
const SEED_TEST_PASSWORD = "Seed-Test-Passw0rd!";

beforeEach(async () => {
  await resetDatabase();
});

describe("Seed", () => {
  it("TEST-F08-02 is idempotent: a second run leaves every table with the same number of rows", async () => {
    await seedDatabase(prisma, SEED_TEST_PASSWORD);
    const afterFirst = await tableCounts();
    await seedDatabase(prisma, SEED_TEST_PASSWORD);
    const afterSecond = await tableCounts();

    expect(afterFirst.User).toBeGreaterThan(0);
    expect(afterSecond).toEqual(afterFirst);
  });

  it("creates the demo accounts of both roles described in the F-08 contract", async () => {
    await seedDatabase(prisma, SEED_TEST_PASSWORD);
    const users = await prisma.user.findMany({ orderBy: { email: "asc" }, select: { email: true, role: true } });
    expect(users).toEqual([
      { email: "alice@customer.test", role: "RESPONDENT" },
      { email: "bruno@customer.test", role: "RESPONDENT" },
      { email: "camille@cafe.test", role: "SURVEY_OWNER" },
      { email: "chloe@customer.test", role: "RESPONDENT" },
      { email: "lucas@cafe.test", role: "SURVEY_OWNER" },
    ]);
  });

  it("TEST-F01-06 stores only bcrypt hashes with a cost of at least 10, never the plaintext password", async () => {
    await seedDatabase(prisma, SEED_TEST_PASSWORD);
    const users = await prisma.user.findMany({ select: { passwordHash: true } });

    for (const { passwordHash } of users) {
      expect(passwordHash).not.toBe(SEED_TEST_PASSWORD);
      expect(passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(bcrypt.getRounds(passwordHash)).toBeGreaterThanOrEqual(10);
      expect(await bcrypt.compare(SEED_TEST_PASSWORD, passwordHash)).toBe(true);
    }
  });

  it("refuses to run without a password", async () => {
    await expect(seedDatabase(prisma, "")).rejects.toThrow(/SEED_PASSWORD/);
  });
});
