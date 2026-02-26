import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import CustomerNav from "../../components/CustomerNav";
import "../../Css/customer.css";

// Lightweight session fetch
async function fetchSession() {
  try {
    const res = await fetch("/api/session", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.authenticated ? j.user : null;
  } catch {
    return null;
  }
}

export default function CustomerChat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [themeMode, setThemeMode] = useState(
    () => document.documentElement.getAttribute("data-theme") || "light",
  );

  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const mode =
        document.documentElement.getAttribute("data-theme") || "light";
      setThemeMode(mode);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    (async () => {
      const u = await fetchSession();
      if (!u || u.role !== "customer") {
        window.location.href = "/login";
        return;
      }

      setUser(u);

      try {
        const res = await fetch(`/chat/customer/${u.id}/messages`);
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Failed to load messages");
        setMessages(j.messages || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }

      // socket init
      socketRef.current = io("/", {
        path: "/socket.io",
        transports: ["websocket"],
        withCredentials: true,
      });

      socketRef.current.emit("chat:join", { customerId: u.id });

      socketRef.current.on("chat:new", (msg) => {
        if (String(msg.customerId) === String(u.id)) {
          setMessages((list) => [...list, msg]);
          scrollToBottom();
        }
      });

      socketRef.current.on("chat:deleted", (payload) => {
        if (!payload?._id) return;
        setMessages((list) =>
          list.filter((msg) => String(msg._id) !== String(payload._id)),
        );
      });
    })();

    return () => {
      observer.disconnect();
      socketRef.current?.disconnect();
    };
  }, []);

  const palette =
    themeMode === "dark"
      ? {
          pageBg: "#0f131a",
          cardBg: "#111827",
          cardShadow: "0 10px 25px rgba(0,0,0,0.35)",
          headerGrad: "linear-gradient(135deg,#3b82f6,#2563eb)",
          msgsBg: "#0f131a",
          msgOtherBg: "#1f2937",
          msgOtherText: "#e5e7eb",
          msgMineGrad: "linear-gradient(135deg,#6366f1,#4f46e5)",
          divider: "#1f2937",
          inputBg: "#0b0f16",
          inputBorder: "#334155",
          sendGrad: "linear-gradient(135deg,#4f46e5,#4338ca)",
          textPrimary: "#e5e7eb",
        }
      : {
          pageBg: "#eef1f5",
          cardBg: "#ffffff",
          cardShadow: "0 10px 25px rgba(0,0,0,0.12)",
          headerGrad: "linear-gradient(135deg,#3b82f6,#2563eb)",
          msgsBg: "#f7f9fc",
          msgOtherBg: "#e5e7eb",
          msgOtherText: "#111",
          msgMineGrad: "linear-gradient(135deg,#6366f1,#4f46e5)",
          divider: "#e5e7eb",
          inputBg: "#f9fafb",
          inputBorder: "#d1d5db",
          sendGrad: "linear-gradient(135deg,#4f46e5,#4338ca)",
          textPrimary: "#111",
        };

  async function sendMessage(e) {
    e.preventDefault();
    if (!user || uploading) return;
    const text = input.trim();
    const hasFile = Boolean(pendingFile);
    if (!text && !hasFile) return;

    try {
      setUploading(hasFile);

      if (hasFile) {
        const form = new FormData();
        form.append("file", pendingFile);
        if (text) form.append("text", text);
        const res = await fetch(`/chat/customer/${user.id}/attachments`, {
          method: "POST",
          body: form,
        });
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Upload failed");
        setMessages((list) => [...list, j.message]);
      } else {
        const res = await fetch(`/chat/customer/${user.id}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ text }),
        });
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Send failed");
        setMessages((list) => [...list, j.message]);
      }

      setInput("");
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      scrollToBottom();
    } catch (err) {
      alert(err.message || "Message failed");
    } finally {
      setUploading(false);
    }
  }

  function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setPendingFile(null);
      return;
    }
    setPendingFile(file);
  }

  function clearPendingFile() {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteMessage(messageId) {
    if (!user || !messageId) return;
    const confirmed = window.confirm("Delete this message?");
    if (!confirmed) return;
    try {
      setDeletingId(String(messageId));
      const res = await fetch(
        `/chat/customer/${user.id}/messages/${messageId}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        },
      );
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Delete failed");
      setMessages((list) =>
        list.filter((msg) => String(msg._id) !== String(messageId)),
      );
    } catch (err) {
      alert(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.pageBg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CustomerNav />

      {/* Chat Container - Full View */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: palette.cardBg,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: palette.headerGrad,
            color: "#fff",
            fontWeight: 600,
            fontSize: 18,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          Chat with Managers
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            Managers respond as soon as possible
          </div>
        </div>

        {/* Messages Section */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "20px 24px",
            background: palette.msgsBg,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "crimson" }}>{error}</p>
          ) : messages.length === 0 ? (
            <p style={{ color: "#888" }}>No messages yet. Say hello!</p>
          ) : (
            messages.map((m) => {
              const mine = String(m.senderId) === String(user.id);
              return (
                <div
                  key={m._id || m.createdAt + Math.random()}
                  style={{
                    display: "flex",
                    justifyContent: mine ? "flex-end" : "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 14,
                      maxWidth: "70%",
                      background: mine
                        ? palette.msgMineGrad
                        : palette.msgOtherBg,
                      color: mine ? "#fff" : palette.msgOtherText,
                      boxShadow:
                        themeMode === "dark"
                          ? "0 2px 6px rgba(0,0,0,0.35)"
                          : "0 2px 6px rgba(0,0,0,0.12)",
                      fontSize: 15,
                      lineHeight: 1.4,
                      position: "relative",
                    }}
                  >
                    {m.attachment?.url ? (
                      m.attachment.type?.startsWith("image/") ? (
                        <a
                          href={m.attachment.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={m.attachment.url}
                            alt={m.attachment.name || "attachment"}
                            style={{
                              maxWidth: "100%",
                              borderRadius: 8,
                              display: "block",
                            }}
                          />
                        </a>
                      ) : (
                        <a
                          href={m.attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: mine ? "#fff" : "#222",
                            textDecoration: "underline",
                          }}
                        >
                          {m.attachment.name || "Download file"}
                        </a>
                      )
                    ) : null}

                    {m.text ? (
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          marginTop: m.attachment ? 8 : 0,
                        }}
                      >
                        {m.text}
                      </div>
                    ) : null}

                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.7,
                        marginTop: 6,
                        textAlign: mine ? "right" : "left",
                      }}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {!mine && m.senderRole === "manager" && (
                        <span style={{ marginLeft: 6 }}>• Manager</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Section */}
        <form
          onSubmit={sendMessage}
          style={{
            display: "flex",
            padding: "14px 20px",
            borderTop: `1px solid ${palette.divider}`,
            background: palette.cardBg,
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 30,
              border: `1px solid ${palette.inputBorder}`,
              outline: "none",
              fontSize: 15,
              background: palette.inputBg,
              color: palette.textPrimary,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={onPickFile}
              disabled={uploading}
              style={{ marginLeft: 12 }}
            />
            {pendingFile ? (
              <div
                style={{
                  fontSize: 12,
                  color: palette.textPrimary,
                  marginLeft: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>
                  Ready to send: {pendingFile.name} ({" "}
                  {Math.round(pendingFile.size / 1024)} KB)
                </span>
                <button
                  type="button"
                  onClick={clearPendingFile}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>
          {uploading && (
            <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>
              Uploading...
            </span>
          )}

          <button
            type="submit"
            disabled={uploading}
            style={{
              padding: "12px 22px",
              marginLeft: 12,
              borderRadius: 30,
              background: palette.sendGrad,
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow:
                themeMode === "dark"
                  ? "0 4px 10px rgba(0,0,0,0.35)"
                  : "0 4px 10px rgba(0,0,0,0.15)",
            }}
          >
            {uploading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
