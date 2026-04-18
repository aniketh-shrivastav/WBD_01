import React from "react";
import { render, screen } from "@testing-library/react";
import Logout from "../pages/Logout";

describe("Logout page", () => {
  test("clears auth token and redirects to backend logout endpoint", () => {
    window.localStorage.setItem("auth_token", "jwt-value");

    const originalLocation = window.location;
    delete window.location;
    window.location = {
      ...originalLocation,
      port: "5173",
      origin: "http://localhost:5173",
      href: "",
    };

    render(<Logout />);

    expect(window.localStorage.getItem("auth_token")).toBeNull();
    expect(window.location.href).toContain("http://localhost:3000/logout?next=");
    expect(screen.getByText(/Logging you out/i)).toBeTruthy();

    window.location = originalLocation;
  });
});
