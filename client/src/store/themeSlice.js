import { createSlice } from "@reduxjs/toolkit";

const SCOPES = ["global", "manager", "admin", "customer", "seller", "service"];

function prefersDarkMode() {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  } catch {
    return false;
  }
}

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return prefersDarkMode() ? "dark" : "light";
}

function loadScopeMode(scope, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const scoped = window.localStorage.getItem(`theme:${scope}`);
    if (scoped === "light" || scoped === "dark") return scoped;
    if (scope === "global") {
      const legacy = window.localStorage.getItem("theme");
      if (legacy === "light" || legacy === "dark") return legacy;
    }
  } catch {}
  return fallback;
}

const baseTheme = getInitialTheme();
const initialModes = SCOPES.reduce((acc, scope) => {
  acc[scope] = loadScopeMode(scope, baseTheme);
  return acc;
}, {});

const initialState = {
  activeScope: "global",
  modes: initialModes,
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setActiveScope(state, action) {
      const scope = action.payload || "global";
      state.activeScope = scope;
      if (!state.modes[scope]) {
        state.modes[scope] = state.modes.global || baseTheme;
      }
    },
    setThemeForScope(state, action) {
      const { scope, mode } = action.payload || {};
      const targetScope = scope || state.activeScope || "global";
      state.modes[targetScope] = mode === "dark" ? "dark" : "light";
    },
    toggleThemeForScope(state, action) {
      const targetScope = action.payload || state.activeScope || "global";
      const current = state.modes[targetScope] || state.modes.global || "light";
      state.modes[targetScope] = current === "dark" ? "light" : "dark";
    },
  },
});

export const { setActiveScope, setThemeForScope, toggleThemeForScope } =
  themeSlice.actions;
export default themeSlice.reducer;
