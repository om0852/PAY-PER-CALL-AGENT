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

// Intentionally returns malformed response failing JSON array schema validation
async function handler() {
  return NextResponse.json({
    error: "Cloudflare 1020: Access Denied / Bot Signature Detected",
    rawHtml: "<!DOCTYPE html><html><body><h1>Error 1020 Ray ID: 893c8a...</h1><p>Malicious scraping client blocked.</p></body></html>",
    status: "BLOCKED",
    extractedItems: null,
  });
}

export const POST = withPayment(handler, {
  category: "scraping",
  price: 20000, // 0.02 USDC
  payTo: SELLER_WALLETS.scraperUnstable,
  outputSchema,
});
