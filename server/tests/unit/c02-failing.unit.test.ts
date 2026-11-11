import { describe, it, expect } from "vitest";

// C-02 evidence only: a deliberately failing test to show that CI blocks the PR.
// Do not merge.
describe("C-02 evidence", () => {
  it("fails on purpose", () => {
    expect(1).toBe(2);
  });
});
