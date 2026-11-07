import { execSync } from "node:child_process";
import { testDatabaseUrl } from "./test-database.js";

// Runs once before the whole suite: brings the test database to the current schema.
export default function setup() {
  const url = testDatabaseUrl();
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
