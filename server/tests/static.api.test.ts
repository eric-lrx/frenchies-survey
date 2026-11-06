import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createApp } from "../src/app.js";

// Lab 5 (#23): in the container, one Express process serves the API and the built React
// app on the same origin, so the session cookie and the /api calls need no CORS.
let staticDir: string;

beforeAll(() => {
  staticDir = mkdtempSync(join(tmpdir(), "cafe-static-"));
  mkdirSync(join(staticDir, "assets"));
  writeFileSync(join(staticDir, "index.html"), "<!doctype html><title>Café Feedback</title><div id=root></div>");
  writeFileSync(join(staticDir, "assets", "app.js"), "console.log('app');");
});

afterAll(() => {
  rmSync(staticDir, { recursive: true, force: true });
});

describe("Serving the built web app (STATIC_DIR)", () => {
  it("serves index.html at / and a built asset with its own type", async () => {
    const app = createApp({ staticDir });

    const home = await request(app).get("/");
    expect(home.status).toBe(200);
    expect(home.headers["content-type"]).toMatch(/text\/html/);
    expect(home.text).toContain("Café Feedback");

    const asset = await request(app).get("/assets/app.js");
    expect(asset.status).toBe(200);
    expect(asset.headers["content-type"]).toMatch(/javascript/);
  });

  it("answers a client-side route such as /owner/surveys/7 with index.html, so a reload works", async () => {
    const res = await request(createApp({ staticDir })).get("/owner/surveys/7");
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id=root>');
  });

  it("keeps unknown API routes and missing assets as 404, never index.html", async () => {
    const app = createApp({ staticDir });

    const api = await request(app).get("/api/does-not-exist");
    expect(api.status).toBe(404);
    expect(api.body).toEqual({ error: { code: "NOT_FOUND", message: "Not found." } });

    const asset = await request(app).get("/assets/missing.js");
    expect(asset.status).toBe(404);
  });

  it("still answers the API normally when the web app is served", async () => {
    const res = await request(createApp({ staticDir })).get("/api/health");
    expect(res.body).toEqual({ data: { status: "ok" } });
  });

  it("accepts a STATIC_DIR relative to the working directory, as in STATIC_DIR=../client/dist", async () => {
    const res = await request(createApp({ staticDir: relative(process.cwd(), staticDir) })).get("/owner/surveys");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<div id=root>");
  });

  it("serves no web app when STATIC_DIR is not set (development uses the Vite server)", async () => {
    const res = await request(createApp()).get("/");
    expect(res.status).toBe(404);
  });
});
