import { NextResponse } from "next/server";
import { withPayment } from "@/lib/x402/middleware";
import { SELLER_WALLETS } from "@/lib/x402/seed";
import { queryLLM } from "@/lib/llm";

const outputSchema = {
  type: "object",
  required: ["sentiment", "score", "category", "confidence", "tags", "processedAt"],
  properties: {
    sentiment: { type: "string", enum: ["POSITIVE", "NEUTRAL", "NEGATIVE"] },
    score: { type: "number" },
    category: { type: "string" },
    confidence: { type: "number" },
    tags: { type: "array", items: { type: "string" } },
    processedAt: { type: "string" },
  },
};

/**
 * Fast deterministic fallback analyzer for zero-latency resilience
 */
function analyzeSentimentAndCategoryRule(text: string): {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  score: number;
  category: string;
  confidence: number;
  tags: string[];
} {
  const lower = text.toLowerCase();

  // Sentiment scoring
  const posWords = ["great", "excellent", "best", "fast", "love", "amazing", "profit", "bullish", "superior", "good", "reliable", "secure", "smooth", "gain"];
  const negWords = ["bad", "terrible", "slow", "fail", "error", "loss", "bearish", "scam", "corrupt", "bug", "reject", "dispute", "down", "poor"];

  let posCount = 0;
  let negCount = 0;
  posWords.forEach((w) => { if (lower.includes(w)) posCount++; });
  negWords.forEach((w) => { if (lower.includes(w)) negCount++; });

  let sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" = "NEUTRAL";
  let score = 0.0;

  if (posCount > negCount) {
    sentiment = "POSITIVE";
    score = Math.min(1.0, 0.4 + (posCount - negCount) * 0.2);
  } else if (negCount > posCount) {
    sentiment = "NEGATIVE";
    score = Math.max(-1.0, -0.4 - (negCount - posCount) * 0.2);
  } else {
    sentiment = "NEUTRAL";
    score = 0.05;
  }

  // Category categorization
  let category = "Technology & AI";
  let confidence = 0.88;
  const tags: string[] = [];

  if (lower.includes("crypto") || lower.includes("usdc") || lower.includes("ethereum") || lower.includes("base") || lower.includes("token") || lower.includes("wallet")) {
    category = "Blockchain & Web3";
    confidence = 0.96;
    tags.push("crypto", "base-l2", "usdc", "blockchain");
  } else if (lower.includes("price") || lower.includes("dollar") || lower.includes("inr") || lower.includes("fx") || lower.includes("revenue") || lower.includes("market") || lower.includes("fee")) {
    category = "Finance & Economics";
    confidence = 0.92;
    tags.push("finance", "forex", "market-rates", "settlement");
  } else if (lower.includes("book") || lower.includes("travel") || lower.includes("trip") || lower.includes("flight") || lower.includes("hotel")) {
    category = "Travel & Lifestyle";
    confidence = 0.94;
    tags.push("travel", "catalogue", "lifestyle");
  } else if (lower.includes("compliance") || lower.includes("sanction") || lower.includes("aml") || lower.includes("audit") || lower.includes("legal")) {
    category = "Legal & Compliance";
    confidence = 0.95;
    tags.push("compliance", "risk-audit", "aml-check");
  } else {
    category = "Autonomous Intelligence";
    confidence = 0.85;
    tags.push("ai-agent", "data-extraction", "intelligence");
  }

  return { sentiment, score, category, confidence, tags };
}

async function handler(req: Request) {
  let inputText = "";

  try {
    const body = await req.json();
    if (typeof body?.text === "string" && body.text.trim()) {
      inputText = body.text.trim();
    } else if (typeof body?.content === "string" && body.content.trim()) {
      inputText = body.content.trim();
    } else if (typeof body?.review === "string" && body.review.trim()) {
      inputText = body.review.trim();
    }
  } catch {
    // Default sample text
  }

  if (!inputText) {
    inputText = "AgentBucket Base Sepolia micro-settlement node processed 50 autonomous agent tasks with 100% schema accuracy and zero gas fees! Excellent execution reliability.";
  }

  let sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" = "POSITIVE";
  let score = 0.85;
  let category = "Blockchain & Web3";
  let confidence = 0.95;
  let tags = ["usdc", "base-sepolia", "agent-economy", "autonomous-settlement"];

  // 1. Try LLM if available for deep semantic parsing
  try {
    const prompt = `Analyze this text. Output JSON only:
Text: "${inputText.slice(0, 500)}"

Format:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "score": -1.0 to 1.0,
  "category": "string (e.g. Technology, Finance, Travel, E-commerce, Compliance)",
  "confidence": 0.5 to 1.0,
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const llmRaw = await queryLLM(prompt);
    if (llmRaw) {
      const match = llmRaw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(parsed.sentiment)) {
          sentiment = parsed.sentiment;
        }
        if (typeof parsed.score === "number") score = Math.max(-1.0, Math.min(1.0, parsed.score));
        if (typeof parsed.category === "string" && parsed.category.trim()) category = parsed.category.trim();
        if (typeof parsed.confidence === "number") confidence = Math.max(0.1, Math.min(1.0, parsed.confidence));
        if (Array.isArray(parsed.tags)) tags = parsed.tags.map(String).slice(0, 5);
      }
    }
  } catch {
    // Fall back to rule-based analysis
    const ruleResult = analyzeSentimentAndCategoryRule(inputText);
    sentiment = ruleResult.sentiment;
    score = ruleResult.score;
    category = ruleResult.category;
    confidence = ruleResult.confidence;
    tags = ruleResult.tags;
  }

  return NextResponse.json({
    sentiment,
    score: parseFloat(score.toFixed(2)),
    category,
    confidence: parseFloat(confidence.toFixed(2)),
    tags,
    processedAt: new Date().toISOString(),
  });
}

// Protected by HTTP 402 withPayment middleware
export const POST = withPayment(handler, {
  category: "sentiment",
  price: 35000, // 0.0350 USDC
  payTo: SELLER_WALLETS.sentiment,
  outputSchema,
});
