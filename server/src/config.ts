import { config as loadEnv } from "dotenv";

// Reads server/.env in development. Variables already set (by the tests, by Cloud Run)
// are never overridden.
loadEnv({ quiet: true });

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Copy server/.env.example to server/.env and fill it in.`);
  }
  return value;
}

export const settings = {
  port: Number(process.env.PORT ?? 3000),
  isProduction: process.env.NODE_ENV === "production",
};
