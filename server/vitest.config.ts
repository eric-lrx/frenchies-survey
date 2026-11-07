import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Applies migrations to the test database once, after checking that it is one.
    globalSetup: ["tests/setup/global-setup.ts"],
    // Points DATABASE_URL at the test database before any application module loads.
    setupFiles: ["tests/setup/env.ts"],
    // Every API test file empties the same database, so files must not run at the same time.
    fileParallelism: false,
  },
});
