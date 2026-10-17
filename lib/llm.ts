/**
 * Multi-Provider LLM Engine
 * Supports Groq (ultra-fast, high free limits), OpenRouter (free community models),
 * Local Ollama (offline dev), and Gemini API fallback.
 */

// 1. Groq Configuration (Recommended: Free tier, ultra-fast 500+ tok/s)
// Get free key from: https://console.groq.com
const getGroqKey = () => process.env.GROQ_API_KEY;
const getGroqModel = () => process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

// 2. OpenRouter Configuration (Free models available)
// Get free key from: https://openrouter.ai/keys
const getOpenRouterKey = () => process.env.OPENROUTER_API_KEY;
const getOpenRouterModel = () =>
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.2-3b-instruct:free";

// 3. Local Ollama & Gemini
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const LOCAL_MODEL = process.env.LOCAL_MODEL || "qwen2.5-coder:3b";
const getGeminiKey = () => process.env.GEMINI_API_KEY;

export async function queryLLM(prompt: string, systemPrompt?: string): Promise<string> {
  // Option A: Try Groq First (Fastest & 100% Free Tier)
  const groqKey = getGroqKey();
  if (groqKey) {
    try {
      const messages: Array<{ role: string; content: string }> = [];
      if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
      messages.push({ role: "user", content: prompt });

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: getGroqModel(),
          messages,
          temperature: 0.2,
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(6000), // 6s timeout
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch {
      // Fall through to next provider
    }
  }

  // Option B: Try OpenRouter (Community free models)
  const openRouterKey = getOpenRouterKey();
  if (openRouterKey) {
    try {
      const messages: Array<{ role: string; content: string }> = [];
      if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
      messages.push({ role: "user", content: prompt });

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://agentbucket.io",
          "X-Title": "AgentBucket Platform",
        },
        body: JSON.stringify({
          model: getOpenRouterModel(),
          messages,
          temperature: 0.2,
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch {
      // Fall through to next provider
    }
  }

  // Option C: Try Local Ollama (Only in local dev; skip on Vercel)
  if (process.env.NODE_ENV !== "production") {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: LOCAL_MODEL,
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(2000), // Fast 2s check
      });

      if (res.ok) {
        const data = await res.json();
        if (data.response && data.response.trim()) {
          return data.response.trim();
        }
      }
    } catch {
      // Local Ollama offline
    }
  }

  // Option D: Gemini API (if key provided)
  const geminiKey = getGeminiKey();
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
                  },
                ],
              },
            ],
          }),
          signal: AbortSignal.timeout(6000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch {
      // Fall through
    }
  }

  return "";
}
