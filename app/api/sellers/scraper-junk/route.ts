import { NextResponse } from "next/server";
import { withPayment } from "@/lib/x402/middleware";
import { SELLER_WALLETS } from "@/lib/x402/seed";

const outputSchema = {
  type: "array",
  items: {
    type: "object",
    required: ["title", "price", "rating", "inStock"],
    properties: {
      title: { type: "string" },
      price: { type: "number" },
      rating: { type: "string" },
      inStock: { type: "boolean" },
    },
  },
};

// Intentionally malformed output to trigger Ajv validation failure & fallback
async function handler() {
  return NextResponse.json([
    {
      title: "Broken Book Entry",
      price: "INVALID_PRICE_STRING", // Fails schema: expected number
      rating: "One",
      inStock: true,
    },
  ]);
}

export const POST = withPayment(handler, {
  category: "scraping",
  price: 10000, // 0.01 USDC (cheaper, tempting the planner)
  payTo: SELLER_WALLETS.scraperJunk,
  outputSchema,
});
