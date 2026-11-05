import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../src/auth/AuthContext.js";
import Login from "../src/pages/Login.js";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Login screen", () => {
  it("UI-01 shows the generic message on a failed sign-in, keeps the email and enables the button again", async () => {
    let resolveLogin: (r: Response) => void = () => {};
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      // Page-load check (F-01 contract v1.1): nobody is signed in.
      if (url.endsWith("/api/auth/session")) {
        return Promise.resolve(jsonResponse(200, { data: null }));
      }
      return new Promise<Response>((resolve) => {
        resolveLogin = resolve;
      });
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    );

    const email = await screen.findByLabelText(/email/i);
    await userEvent.type(email, "camille@cafe.test");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // While the request runs the button is disabled, so a second click sends nothing.
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();

    resolveLogin(jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
    expect(screen.getByLabelText(/email/i)).toHaveValue("camille@cafe.test");
    expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled();
  });
});
