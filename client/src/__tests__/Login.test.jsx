import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../firebase", () => ({
  signInWithGoogle: jest.fn(),
}));

describe("Login page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    window.localStorage.clear();
  });

  test("submits login with normalized email and stores auth token", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        token: "jwt-1",
        redirect: "/customer/index",
      }),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "  USER@Example.COM  " },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("/login");
    expect(options.credentials).toBe("include");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      email: "user@example.com",
      password: "secret",
    });

    expect(window.localStorage.getItem("auth_token")).toBe("jwt-1");
    expect(mockNavigate).toHaveBeenCalledWith("/customer/index", {
      replace: true,
    });
  });

  test("shows invalid credentials error from backend response", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid credentials" }),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "a@a.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "bad" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Invalid credentials",
      );
    });
  });
});
