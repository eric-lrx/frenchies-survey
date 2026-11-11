import { requireEnv, settings } from "./config.js";
import { createApp } from "./app.js";
import { prisma } from "./prisma.js";

// Fail at start-up with a clear message rather than on the first request.
requireEnv("DATABASE_URL");

const server = createApp({ staticDir: settings.staticDir }).listen(settings.port, () => {
  console.log(`Café Feedback API listening on port ${settings.port}`);
});

// Cloud Run sends SIGTERM before stopping an instance: finish open requests, then close
// the database pool.
process.on("SIGTERM", () => {
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
});
