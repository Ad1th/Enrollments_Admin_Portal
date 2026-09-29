// Any OpenAI-compatible chat endpoint. Defaults to Groq's free tier; point
// LLM_BASE_URL at xAI (https://api.x.ai/v1, model e.g. grok-3-mini), OpenRouter
// (https://openrouter.ai/api/v1, a ":free" model) or anything else compatible.
const BASE_URL = () => process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
export const MODEL = () => process.env.LLM_MODEL || "llama-3.3-70b-versatile";

export const llmConfigured = () => Boolean(process.env.LLM_API_KEY);

export const chatJSON = async ({ system, user, temperature = 0.2, timeoutMs = 25000 }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL()}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL(),
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(body?.error?.message || `LLM request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    const text = body?.choices?.[0]?.message?.content || "{}";
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } finally {
    clearTimeout(timer);
  }
};
