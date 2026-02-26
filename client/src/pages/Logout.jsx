import React, { useEffect } from "react";

export default function Logout() {
  useEffect(() => {
    // Prefer a server-driven redirect to guarantee session destruction across ports
    const isDev = window.location.port === "5173";
    const backendBase = isDev ? "http://localhost:3000" : ""; // same origin in prod
    const next = window.location.origin + "/";
    // Hard navigate so cookies are sent by the browser and server handles redirect
    window.location.href = `${backendBase}/logout?next=${encodeURIComponent(
      next
    )}`;
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Logging you out…</h2>
      <p>Please wait.</p>
    </div>
  );
}
