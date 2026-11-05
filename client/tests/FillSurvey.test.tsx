import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SurveyPage from "../src/pages/respondent/SurveyPage.js";

const SURVEY = {
  id: 7,
  title: "Spring menu feedback",
  description: "Tell us what you think of the new spring menu.",
  alreadyResponded: false,
  questions: [
    { id: 21, position: 1, text: "How would you rate the new pastries?", type: "RATING", options: [] },
    {
      id: 22,
      position: 2,
      text: "Which drink did you order?",
      type: "CHOICE",
      options: [
        { id: 5, position: 1, label: "Latte" },
        { id: 6, position: 2, label: "Iced tea" },
      ],
    },
  ],
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/surveys/7"]}>
      <Routes>
        <Route path="/surveys/:id" element={<SurveyPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Fill survey screen", () => {
  it("UI-03 sends one request on a double click, then shows the duplicate message with a link back", async () => {
    let respond: (r: Response) => void = () => {};
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (init?.method === "POST") {
        return new Promise<Response>((resolve) => {
          respond = resolve;
        });
      }
      return Promise.resolve(json(200, { data: SURVEY }));
    });
    renderPage();

    await userEvent.click(await screen.findByLabelText("4"));
    await userEvent.click(screen.getByLabelText("Latte"));
    await userEvent.dblClick(screen.getByRole("button", { name: "Submit" }));

    const posts = fetchSpy.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual({
      answers: [
        { questionId: 21, ratingValue: 4 },
        { questionId: 22, optionId: 5 },
      ],
    });
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();

    respond(json(409, { error: { code: "DUPLICATE_RESPONSE", message: "You have already answered this survey." } }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You have already answered this survey.");
    expect(screen.getByRole("link", { name: "Back to open surveys" })).toHaveAttribute("href", "/surveys");
  });

  it("asks for every unanswered question before sending anything", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json(200, { data: SURVEY }));
    renderPage();

    await userEvent.click(await screen.findByLabelText("4"));
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getAllByText("Please answer this question")).toHaveLength(1);
    expect(screen.getByRole("group", { name: "Which drink did you order?" })).toHaveAccessibleDescription("Please answer this question");
    expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("shows no form when the survey was already answered", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(200, { data: { ...SURVEY, alreadyResponded: true } }));
    renderPage();

    expect(await screen.findByText("You have already answered this survey.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });
});
