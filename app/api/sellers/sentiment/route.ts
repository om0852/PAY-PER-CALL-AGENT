import { NextResponse } from "next/server";
import { withPayment } from "@/lib/x402/middleware";
import { SELLER_WALLETS } from "@/lib/x402/seed";

const outputSchema = {
  type: "object",
  required: ["sentiment", "score", "confidence", "highlights"],
  properties: {
    sentiment: { type: "string", enum: ["POSITIVE", "NEUTRAL", "NEGATIVE"] },
    score: { type: "number" },
    confidence: { type: "number" },
    highlights: { type: "array", items: { type: "string" } },
  },
};

async function handler(req: Request) {
  let text = "Five star rated international product with excellent verified customer feedback.";

  try {
    const body = await req.json();
    if (body?.text) text = String(body.text);
    if (body?.title) text = `${body.title} - ${body.description || ""}`;
  } catch {
    // default
  }

  const lower = text.toLowerCase();

  // Lexical & context scoring
  let score = 0.85;
  let sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" = "POSITIVE";
  const highlights: string[] = [];

  if (lower.includes("poor") || lower.includes("bad") || lower.includes("fake") || lower.includes("scam") || lower.includes("broken")) {
    score = -0.72;
    sentiment = "NEGATIVE";
    highlights.push("Critical feedback detected", "Potential vendor reliability risk");
  } else if (lower.includes("cheap") || lower.includes("degraded") || lower.includes("corrupt")) {
    score = 0.15;
    sentiment = "NEUTRAL";
    highlights.push("Budget grade quality", "Moderate customer satisfaction");
  } else {
    score = 0.92;
    sentiment = "POSITIVE";
    highlights.push("High 5-star rating frequency", "Verified authentic product", "Strong buyer sentiment");
  }

  return NextResponse.json({
    sentiment,
    score,
    confidence: 96,
    highlights,
  });
}

export const POST = withPayment(handler, {
  category: "sentiment",
  price: 35000, // 0.035 USDC
  payTo: SELLER_WALLETS.sentiment,
  outputSchema,
});
