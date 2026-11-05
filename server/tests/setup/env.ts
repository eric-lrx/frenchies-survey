import { testDatabaseUrl } from "./test-database.js";

// Runs in every test worker before the test file is imported, so the application's
// Prisma client connects to the test database and never to the development one.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = "test";
