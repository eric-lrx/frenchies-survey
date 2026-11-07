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

  it("creates the demo surveys of the F-08 contract, each with questions (F-03)", async () => {
    await seedDatabase(prisma, SEED_TEST_PASSWORD);
    const surveys = await prisma.survey.findMany({
      orderBy: { title: "asc" },
      select: { title: true, status: true, owner: { select: { email: true } }, _count: { select: { questions: true } } },
    });
    expect(surveys.map((s) => [s.title, s.status, s.owner.email])).toEqual([
      ["Barista service", "PUBLISHED", "lucas@cafe.test"],
      ["Spring menu feedback", "PUBLISHED", "camille@cafe.test"],
      ["Terrace opening", "DRAFT", "camille@cafe.test"],
      ["Winter drinks", "CLOSED", "camille@cafe.test"],
    ]);
    for (const s of surveys) expect(s._count.questions).toBeGreaterThan(0);
  });

  it("creates the demo responses: Alice and Bruno on Spring menu feedback, Chloé on Winter drinks (F-06)", async () => {
    await seedDatabase(prisma, SEED_TEST_PASSWORD);
    const responses = await prisma.response.findMany({
      select: { survey: { select: { title: true } }, respondent: { select: { email: true } }, _count: { select: { answers: true } } },
      orderBy: [{ surveyId: "asc" }, { respondentId: "asc" }],
    });
    expect(responses.map((r) => [r.survey.title, r.respondent.email, r._count.answers])).toEqual([
      ["Spring menu feedback", "alice@customer.test", 2],
      ["Spring menu feedback", "bruno@customer.test", 2],
      ["Winter drinks", "chloe@customer.test", 2],
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
