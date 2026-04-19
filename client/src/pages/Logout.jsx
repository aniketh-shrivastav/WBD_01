import React, { useEffect } from "react";
import { getBackendUrl } from "../utils/api";

export default function Logout() {
  useEffect(() => {
    localStorage.removeItem("auth_token");
    const next = window.location.origin + "/";
    // Hard navigate so cookies are sent by the browser and server handles redirect
    window.location.href = getBackendUrl(
      `/logout?next=${encodeURIComponent(next)}`,
    );
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Logging you out…</h2>
      <p>Please wait.</p>
    </div>
  );
}
