import { describe, expect, it } from "vitest";
import { parseId } from "../../src/http.js";

// F-02: a path id that is not a positive integer is treated as "not found".
describe("parseId", () => {
  it("accepts positive integers", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("42")).toBe(42);
  });

  it.each(["0", "-3", "abc", "1.5", "1e3", " 7", "", "99999999999999999999"])("rejects %j", (raw) => {
    expect(parseId(raw)).toBeNull();
  });
});
