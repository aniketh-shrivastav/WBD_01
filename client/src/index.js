import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import App from "./App";
import { Provider, useSelector, useDispatch } from "react-redux";
import { store } from "./store";
import { setActiveScope } from "./store/themeSlice";

const container = document.getElementById("root");
const root = createRoot(container);

function resolveThemeScope(pathname = "") {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/manager")) return "manager";
  if (pathname.startsWith("/customer")) return "customer";
  if (pathname.startsWith("/seller")) return "seller";
  if (pathname.startsWith("/service")) return "service";
  return "global";
}

function ThemeApplier() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { modes } = useSelector((s) => s.theme);
  const scope = resolveThemeScope(location.pathname);

  useEffect(() => {
    dispatch(setActiveScope(scope));
  }, [dispatch, scope]);

  const mode = modes[scope] || modes.global || "light";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(`theme:${scope}`, mode);
      if (scope === "global") {
        localStorage.setItem("theme", mode);
      }
    } catch {}
  }, [mode, scope]);
  return null;
}

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeApplier />
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
