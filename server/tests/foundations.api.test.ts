import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

// F-08 Project foundations: the probes and the error handling every feature relies on.
const app = createApp();

describe("F-08 probes and error handling", () => {
  it("TEST-F08-03 GET /api/health answers 200 without reaching the database or returning private data", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: "ok" } });
  });

  it("answers an unknown API route with a JSON 404, not an HTML page", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Not found." } });
  });

  it("answers a malformed JSON body with a 400, not a stack trace", async () => {
    const res = await request(app).post("/api/health").set("Content-Type", "application/json").send("{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.(ts|js):\d+/);
  });
});
