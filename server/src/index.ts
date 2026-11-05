import { requireEnv, settings } from "./config.js";
import { createApp } from "./app.js";

// Fail at start-up with a clear message rather than on the first request.
requireEnv("DATABASE_URL");

createApp().listen(settings.port, () => {
  console.log(`Café Feedback API listening on http://localhost:${settings.port}`);
});
