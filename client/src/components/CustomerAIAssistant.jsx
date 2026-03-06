import React, { useMemo, useState } from "react";
import "../Css/customerAssistant.css";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I’m your AutoCustomizer assistant. Ask me about products, booking services, cart, orders, payments, profile, or customer support flows.",
};

export default function CustomerAIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  function backendBase() {
    const { protocol, hostname, port } = window.location;
    if (port === "5173") return `${protocol}//${hostname}:3000`;
    return "";
  }

  async function sendMessage(e) {
    e?.preventDefault?.();
    if (!canSend) return;

    const userText = input.trim();
    const nextMessages = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${backendBase()}/customer/api/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: userText,
          currentPath: window.location.pathname,
          history: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        const fallbackByStatus =
          res.status === 404
            ? "Assistant endpoint not found. Please ensure backend server is running on port 3000."
            : null;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data?.message ||
              fallbackByStatus ||
              "I couldn’t respond right now. Please try again in a moment.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "I couldn’t generate a response. Please try again.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error while contacting assistant. Please retry.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="customer-ai-wrap" aria-live="polite">
      {open && (
        <section className="customer-ai-panel" aria-label="AutoCustomizer assistant">
          <header className="customer-ai-header">
            <div>
              <h3>AutoCustomizer AI Help</h3>
              <p>Website-aware assistant for customer pages</p>
            </div>
            <button
              type="button"
              className="customer-ai-close"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              ×
            </button>
          </header>

          <div className="customer-ai-messages">
            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`customer-ai-bubble ${msg.role === "user" ? "user" : "assistant"}`}
              >
                {msg.content}
              </div>
            ))}
            {loading && <div className="customer-ai-typing">Assistant is typing…</div>}
          </div>

          <form className="customer-ai-input-row" onSubmit={sendMessage}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products, booking, orders, or profile help..."
              rows={2}
              maxLength={2000}
            />
            <button type="submit" disabled={!canSend}>
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="customer-ai-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide assistant" : "Open assistant"}
        title="AI Help"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
