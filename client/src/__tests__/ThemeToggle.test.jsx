import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { fireEvent, render, screen } from "@testing-library/react";
import themeReducer from "../store/themeSlice";
import ThemeToggle from "../components/ThemeToggle";

describe("ThemeToggle", () => {
  test("toggles mode for the selected scope", () => {
    const store = configureStore({
      reducer: { theme: themeReducer },
      preloadedState: {
        theme: {
          activeScope: "customer",
          modes: {
            global: "light",
            manager: "light",
            admin: "light",
            customer: "light",
            seller: "light",
            service: "light",
          },
        },
      },
    });

    render(
      <Provider store={store}>
        <ThemeToggle scope="customer" />
      </Provider>,
    );

    expect(screen.getByRole("button").textContent).toContain("Dark");

    fireEvent.click(screen.getByRole("button"));

    expect(store.getState().theme.modes.customer).toBe("dark");
  });
});
