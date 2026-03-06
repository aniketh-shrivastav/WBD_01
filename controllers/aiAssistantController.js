const WEBSITE_CONTEXT = `You are AutoCustomizer Assistant for the AutoCustomizer platform.

Platform overview:
- AutoCustomizer is a full-stack web platform for car customization.
- Roles: customer, seller, service-provider, manager, admin.
- Customers can browse approved products, add to cart, place orders, track order/service history, book services, chat with support, and manage profile.
- Sellers manage product listings, inventory, reviews, orders, delivery dates, and earnings/payouts.
- Service providers manage bookings, services offered, booking statuses, costs, reviews, and earnings.
- Managers/admin oversee users, products, orders, support, and dashboards.

Customer pages and flows:
- Products page: /customer/index (search/filter and add-to-cart)
- Services booking: /customer/booking
- Cart: /customer/cart
- History: /customer/history
- Profile: /customer/profile
- Chat: /customer/chat
- Product detail: /customer/product/:id
- Order detail: /customer/order/:id
- Service detail: /customer/service/:id
- Payment success: /customer/payment-success

Business rules and guidance:
- If asked how to buy: advise profile update, add product to cart, checkout, then track in history.
- If asked how to book a service: choose service/provider, submit booking details, track status in history.
- If asked about seller/manager/admin actions, explain those are role-specific and not in customer UI.
- If asked for account or billing changes, provide safe navigation steps in website terms.
- Do not invent unavailable features.
- If unsure, say what is known and suggest the nearest in-app path.

Response style:
- Be concise, helpful, and action-oriented.
- Prefer 3-6 short bullet points or short steps.
- Keep responses focused on this website's functionality.
- If user asks unrelated general trivia, gently redirect to website help.`;

function trimHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string",
    )
    .slice(-10)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 1200),
    }));
}

function shouldRetryWithFallback(status, message = "") {
  const msg = String(message).toLowerCase();
  if (status === 429 || status >= 500) return true;
  return (
    msg.includes("provider returned error") ||
    msg.includes("no endpoints found") ||
    msg.includes("model") ||
    msg.includes("unavailable") ||
    msg.includes("temporarily")
  );
}

async function requestOpenRouter({ apiKey, model, messages }) {
  const payload = {
    model,
    temperature: 0.3,
    max_tokens: 500,
    messages,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
        "X-Title": "AutoCustomizer Assistant",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

exports.chat = async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "AI assistant is not configured. Missing OPENAI_API_KEY.",
      });
    }

    const { message, history = [], currentPath = "" } = req.body || {};
    const userMessage = String(message || "").trim();

    if (!userMessage) {
      return res.status(400).json({
        success: false,
        message: "Please enter a message.",
      });
    }

    const safeHistory = trimHistory(history);
    const baseMessages = [
      { role: "system", content: WEBSITE_CONTEXT },
      {
        role: "system",
        content: `Current page path: ${String(currentPath).slice(0, 120) || "unknown"}`,
      },
      ...safeHistory,
      { role: "user", content: userMessage.slice(0, 2000) },
    ];

    const preferredModel =
      process.env.OPENROUTER_MODEL || "mistralai/mistral-small-3.1-24b-instruct:free";
    const fallbackModels = [
      "meta-llama/llama-3.3-70b-instruct:free",
      "openai/gpt-oss-20b:free",
      "google/gemma-3-4b-it:free",
    ].filter((m) => m !== preferredModel);

    let lastFailure = null;
    const modelsToTry = [preferredModel, ...fallbackModels];

    for (const model of modelsToTry) {
      const { response, data } = await requestOpenRouter({
        apiKey,
        model,
        messages: baseMessages,
      });

      if (response.ok) {
        const reply =
          data?.choices?.[0]?.message?.content ||
          "I could not generate a response. Please try again.";

        return res.json({
          success: true,
          reply: String(reply).trim(),
          model,
        });
      }

      const apiMessage =
        data?.error?.message ||
        data?.message ||
        "Assistant service is unavailable right now.";

      lastFailure = {
        status: response.status,
        message: apiMessage,
        model,
      };

      // Authentication/authorization errors should not retry.
      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({
          success: false,
          message:
            "OpenRouter authentication failed. Please verify OPENAI_API_KEY and restart server.",
        });
      }

      if (!shouldRetryWithFallback(response.status, apiMessage)) {
        return res.status(502).json({ success: false, message: apiMessage });
      }
    }

    return res.status(502).json({
      success: false,
      message: `Assistant providers are currently unavailable for selected model. Last error (${lastFailure?.model || "unknown"}): ${lastFailure?.message || "Unknown error"}`,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({
        success: false,
        message: "Assistant request timed out. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while contacting the assistant.",
    });
  }
};
