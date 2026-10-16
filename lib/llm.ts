/**
 * Local & Cloud LLM Provider
 * Prioritizes local Ollama (qwen2.5-coder:3b) for free offline processing,
 * with seamless fallback to Gemini API or deterministic logic.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const LOCAL_MODEL = process.env.LOCAL_MODEL || "qwen2.5-coder:3b";

export async function queryLLM(prompt: string, systemPrompt?: string): Promise<string> {
  // 1. Try Local Ollama (qwen2.5-coder:3b)
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LOCAL_MODEL,
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (res.ok) {
      const data = await res.json();
      if (data.response && data.response.trim()) {
        return data.response.trim();
      }
    }
  } catch {
    // Local Ollama offline or timed out, fall through to cloud / fallback
  }

  // 2. Try Gemini API if key is present
  const geminiKey = process.env.GEMINI_API_KEY;
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
          signal: AbortSignal.timeout(8000),
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
