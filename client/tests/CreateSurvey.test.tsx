import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NewSurvey from "../src/pages/owner/NewSurvey.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("New survey screen", () => {
  it("UI-02 shows a message next to each invalid field and sends nothing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <MemoryRouter>
        <NewSurvey />
      </MemoryRouter>,
    );

    // Leave the title empty; make the first question a choice with a single option.
    await userEvent.type(screen.getByLabelText("Question 1 text"), "Which drink did you order?");
    await userEvent.selectOptions(screen.getByLabelText("Question 1 type"), "CHOICE");
    await userEvent.type(screen.getByLabelText("Question 1, option 1"), "Latte");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));

    expect(screen.getByText("Must be 3 to 120 characters")).toBeInTheDocument();
    expect(screen.getByText("A choice question needs 2 to 6 options")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Title/)).toHaveAccessibleDescription("Must be 3 to 120 characters");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the survey once and keeps the entered values when the server rejects it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "The survey is not valid.", fields: { title: "Must be 3 to 120 characters" } } }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(
      <MemoryRouter>
        <NewSurvey />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/^Title/), "Spring menu feedback");
    await userEvent.type(screen.getByLabelText("Question 1 text"), "How would you rate the pastries?");
    await userEvent.dblClick(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByText("Must be 3 to 120 characters")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/^Title/)).toHaveValue("Spring menu feedback");
    expect(screen.getByLabelText("Question 1 text")).toHaveValue("How would you rate the pastries?");
  });
});
