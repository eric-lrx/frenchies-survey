import { prisma } from "../src/prisma.js";
import { requireEnv } from "../src/config.js";
import { seedDatabase } from "../src/seed.js";

// `npm run db:seed`: fills the development database with the demo data.
// The demo password is read from SEED_PASSWORD and is never printed.
async function main() {
  await seedDatabase(prisma, requireEnv("SEED_PASSWORD"));
  const users = await prisma.user.count();
  console.log(`Seed complete: ${users} accounts.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
