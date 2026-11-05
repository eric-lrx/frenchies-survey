import { prisma } from "../../src/prisma.js";

// Empties every application table of the test database (the migration history is kept).
// Each API test file calls it in beforeEach, so every test starts from a known state.
export async function resetDatabase() {
  const tables = await applicationTables();
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function applicationTables(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename`;
  return rows.map((r) => r.tablename);
}

// Row count of every application table, used to prove that a call stored nothing.
export async function tableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of await applicationTables()) {
    const [row] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM "public"."${table}"`);
    counts[table] = Number(row.n);
  }
  return counts;
}
