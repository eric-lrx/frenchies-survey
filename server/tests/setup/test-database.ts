import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Loads server/.env (the test runner's working directory is server/).
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

// The automated tests empty every table they touch, so they must never run against the
// development or a real database (F-08 contract, section 2).
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is required to run the tests (see server/.env.example).");
  }
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to run tests on database "${name}": its name must end in _test.`);
  }
  return url;
}
