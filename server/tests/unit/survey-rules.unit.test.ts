import { describe, expect, it } from "vitest";
import { validateSurveyInput } from "../../src/surveys/rules.js";

// UNIT-01 (AC-F03-02): the survey validation rules of the F-03 contract, section 1.
const rating = (text = "How was it?") => ({ text, type: "RATING" });
const choice = (options: unknown[], text = "Which one?") => ({ text, type: "CHOICE", options });

describe("UNIT-01 validateSurveyInput", () => {
  it("accepts the boundaries: titles of 3 and 120 characters, choices with 2 and 6 options, 20 questions", () => {
    for (const title of ["abc", "x".repeat(120)]) {
      expect(validateSurveyInput({ title, questions: [rating()] })).toMatchObject({ ok: true });
    }
    expect(validateSurveyInput({ title: "Menu", questions: [choice(["A", "B"]), choice(["1", "2", "3", "4", "5", "6"])] })).toMatchObject({ ok: true });
    expect(validateSurveyInput({ title: "Menu", questions: Array.from({ length: 20 }, () => rating()) })).toMatchObject({ ok: true });
  });

  it("returns the normalised survey: trimmed text, null description, options in order", () => {
    const result = validateSurveyInput({ title: "  Menu  ", description: "  ", questions: [choice([" Latte ", "Tea"], "  Drink?  ")] });
    expect(result).toEqual({
      ok: true,
      value: { title: "Menu", description: null, questions: [{ text: "Drink?", type: "CHOICE", options: ["Latte", "Tea"] }] },
    });
  });

  const cases: [string, unknown, string, string][] = [
    ["a title of 2 characters", { title: "ab", questions: [rating()] }, "title", "Must be 3 to 120 characters"],
    ["a title of 121 characters", { title: "x".repeat(121), questions: [rating()] }, "title", "Must be 3 to 120 characters"],
    ["a description of 501 characters", { title: "Menu", description: "x".repeat(501), questions: [rating()] }, "description", "Must be 500 characters or fewer"],
    ["no question list", { title: "Menu" }, "questions", "Add 1 to 20 questions"],
    ["21 questions", { title: "Menu", questions: Array.from({ length: 21 }, () => rating()) }, "questions", "Add 1 to 20 questions"],
    ["a question text of 2 characters", { title: "Menu", questions: [rating("ab")] }, "questions[0].text", "Must be 3 to 200 characters"],
    ["an unknown type", { title: "Menu", questions: [{ text: "Tell us", type: "TEXT" }] }, "questions[0].type", "Choose rating or choice"],
    ["options on a rating question", { title: "Menu", questions: [{ ...rating(), options: ["Good"] }] }, "questions[0].options", "A rating question has no options"],
    ["a choice with 1 option", { title: "Menu", questions: [choice(["A"])] }, "questions[0].options", "A choice question needs 2 to 6 options"],
    ["a choice with 7 options", { title: "Menu", questions: [choice(["A", "B", "C", "D", "E", "F", "G"])] }, "questions[0].options", "A choice question needs 2 to 6 options"],
    ["an empty option", { title: "Menu", questions: [choice(["A", "  "])] }, "questions[0].options", "Each option needs 1 to 60 characters"],
    ["an option of 61 characters", { title: "Menu", questions: [choice(["A", "x".repeat(61)])] }, "questions[0].options", "Each option needs 1 to 60 characters"],
    ["duplicate options ignoring case", { title: "Menu", questions: [choice(["Latte", "LATTE"])] }, "questions[0].options", "Options must be different"],
    ["a body that is not an object", "nope", "title", "Must be 3 to 120 characters"],
  ];

  it.each(cases)("rejects %s", (_label, input, field, message) => {
    const result = validateSurveyInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fields[field]).toBe(message);
  });

  it("names the failing question by its index", () => {
    const result = validateSurveyInput({ title: "Menu", questions: [rating(), choice(["Only"])] });
    expect(result).toEqual({ ok: false, fields: { "questions[1].options": "A choice question needs 2 to 6 options" } });
  });
});
