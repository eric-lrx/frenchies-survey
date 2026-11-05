import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SurveySummary from "../src/pages/owner/SurveySummary.js";

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

function renderSummary() {
  render(
    <MemoryRouter initialEntries={["/owner/surveys/7/summary"]}>
      <Routes>
        <Route path="/owner/surveys/:id/summary" element={<SurveySummary />} />
      </Routes>
    </MemoryRouter>,
  );
}

const QUESTIONS_EMPTY = [
  { questionId: 21, position: 1, text: "How would you rate the new pastries?", type: "RATING", average: null, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
  { questionId: 22, position: 2, text: "Which drink did you order?", type: "CHOICE", options: [{ optionId: 5, label: "Latte", count: 0 }, { optionId: 6, label: "Espresso", count: 0 }] },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Summary screen", () => {
  it("UI-04 shows the empty state with a dash for the average when there is no response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json({ data: { surveyId: 7, title: "Spring menu feedback", status: "PUBLISHED", responseCount: 0, questions: QUESTIONS_EMPTY } }),
    );
    renderSummary();

    expect(await screen.findByText("No responses yet")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("How would you rate the new pastries?")).toBeInTheDocument();
  });

  it("UI-04 writes every figure as text: the average out of 5, each rating count, each option count and percentage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json({
        data: {
          surveyId: 7,
          title: "Spring menu feedback",
          status: "PUBLISHED",
          responseCount: 3,
          questions: [
            { ...QUESTIONS_EMPTY[0], average: 4.3, distribution: { "1": 0, "2": 0, "3": 0, "4": 2, "5": 1 } },
            { ...QUESTIONS_EMPTY[1], options: [{ optionId: 5, label: "Latte", count: 2 }, { optionId: 6, label: "Espresso", count: 1 }] },
          ],
        },
      }),
    );
    renderSummary();

    expect(await screen.findByText("3 responses")).toBeInTheDocument();
    expect(screen.getByText("4.3 / 5")).toBeInTheDocument();

    const ratingRows = within(screen.getByRole("table", { name: "How would you rate the new pastries?" })).getAllByRole("row");
    expect(ratingRows.map((r) => r.textContent)).toEqual(["RatingResponses", "10", "20", "30", "42", "51"]);

    const choiceRows = within(screen.getByRole("table", { name: "Which drink did you order?" })).getAllByRole("row");
    expect(choiceRows.map((r) => r.textContent)).toEqual(["OptionResponsesShare", "Latte267%", "Espresso133%"]);
  });
});
