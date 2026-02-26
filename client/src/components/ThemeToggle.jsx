import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleThemeForScope } from "../store/themeSlice";

export default function ThemeToggle({ className, scope }) {
  const { activeScope, modes } = useSelector((state) => state.theme);
  const targetScope = scope || activeScope || "global";
  const mode = modes[targetScope] || modes.global || "light";
  const dispatch = useDispatch();
  return (
    <button
      type="button"
      className={className || "theme-toggle"}
      title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      onClick={() => dispatch(toggleThemeForScope(targetScope))}
    >
      {mode === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
