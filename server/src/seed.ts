import type { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "./auth/password.js";

// Demo data (F-08 contract, section 2). Idempotent: every record is upserted by its natural
// key, so running the seed again changes nothing. Later features add surveys and responses.
const DEMO_USERS: { name: string; email: string; role: Role }[] = [
  { name: "Camille Martin", email: "camille@cafe.test", role: "SURVEY_OWNER" },
  { name: "Lucas Bernard", email: "lucas@cafe.test", role: "SURVEY_OWNER" },
  { name: "Alice Dupont", email: "alice@customer.test", role: "RESPONDENT" },
  { name: "Bruno Petit", email: "bruno@customer.test", role: "RESPONDENT" },
  { name: "Chloé Moreau", email: "chloe@customer.test", role: "RESPONDENT" },
];

export async function seedDatabase(prisma: PrismaClient, password: string) {
  if (!password) {
    throw new Error("SEED_PASSWORD is required to give the demo accounts a password.");
  }
  // Hashed once; an existing account keeps its current password and hash.
  const passwordHash = await hashPassword(password);

  for (const user of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, isActive: true },
      create: { ...user, passwordHash },
    });
  }
}
