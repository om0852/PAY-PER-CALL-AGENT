import { NextResponse } from "next/server";
import { withPayment } from "@/lib/x402/middleware";
import { SELLER_WALLETS } from "@/lib/x402/seed";

const outputSchema = {
  type: "object",
  required: ["network", "prices", "gasGwei", "timestamp"],
  properties: {
    network: { type: "string" },
    prices: {
      type: "object",
      required: ["ETH", "USDC"],
      properties: {
        ETH: { type: "number" },
        BTC: { type: "number" },
        USDC: { type: "number" },
      },
    },
    gasGwei: { type: "number" },
    timestamp: { type: "string" },
  },
};

async function handler() {
  let ethPrice = 2650.45;
  let btcPrice = 67800.0;
  const usdcPrice = 1.0;
  const gasGwei = 0.0015; // Base Sepolia L2 ultra low gas

  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd", {
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ethereum?.usd) ethPrice = Number(data.ethereum.usd);
      if (data.bitcoin?.usd) btcPrice = Number(data.bitcoin.usd);
    }
  } catch {
    // Fallback to latest standard live estimates
  }

  return NextResponse.json({
    network: "Base Sepolia (84532)",
    prices: {
      ETH: ethPrice,
      BTC: btcPrice,
      USDC: usdcPrice,
    },
    gasGwei,
    timestamp: new Date().toISOString(),
  });
}

export const POST = withPayment(handler, {
  category: "crypto-oracle",
  price: 20000, // 0.02 USDC
  payTo: SELLER_WALLETS.cryptoOracle,
  outputSchema,
});
