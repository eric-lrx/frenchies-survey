import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the development servers and the seeded development
// database (docs/sprints/sprint-1/sts.md). `npm run e2e` starts the servers when they are
// not already running.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  webServer: [
    { command: "npm run dev -w server", url: "http://localhost:3000/api/health", reuseExistingServer: true, timeout: 60_000 },
    { command: "npm run dev -w client", url: "http://localhost:5173", reuseExistingServer: true, timeout: 60_000 },
  ],
});
