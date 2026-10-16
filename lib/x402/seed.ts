import { connectToDatabase } from "../mongodb";
import Wallet from "../models/Wallet";
import Service from "../models/Service";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// Deterministic or generated buyer private key
const DEFAULT_BUYER_PK =
  (process.env.BUYER_PRIVATE_KEY as `0x${string}`) ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil #0 well known testnet key

export const SELLER_WALLETS = {
  scraper: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
  scraperJunk: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
  fxRates: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
  hindiSummary: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65".toLowerCase(),
  facilitator: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4df".toLowerCase(),
};

export async function ensureSeededData() {
  await connectToDatabase();

  const buyerAccount = privateKeyToAccount(DEFAULT_BUYER_PK);
  const buyerAddress = buyerAccount.address.toLowerCase();

  // 1. Ensure Buyer Wallet with 10.00 USDC (10,000,000 atomic units)
  await Wallet.findOneAndUpdate(
    { address: buyerAddress },
    {
      $setOnInsert: {
        address: buyerAddress,
        privateKey: DEFAULT_BUYER_PK,
        balance: 10000000, // 10 USDC
        role: "buyer",
        label: "Primary Buyer Agent",
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 2. Ensure Facilitator & Seller Wallets
  const seedWallets = [
    {
      address: SELLER_WALLETS.facilitator,
      role: "facilitator" as const,
      label: "Facilitator (x402 Protocol)",
      balance: 1000000,
    },
    {
      address: SELLER_WALLETS.scraper,
      role: "seller" as const,
      label: "Books Scraper Pro (Cheerio)",
      balance: 0,
    },
    {
      address: SELLER_WALLETS.scraperJunk,
      role: "seller" as const,
      label: "Budget Scraper (Buggy)",
      balance: 0,
    },
    {
      address: SELLER_WALLETS.fxRates,
      role: "seller" as const,
      label: "Frankfurter FX Rates API",
      balance: 0,
    },
    {
      address: SELLER_WALLETS.hindiSummary,
      role: "seller" as const,
      label: "Hindi Translation & Summary AI",
      balance: 0,
    },
  ];

  for (const w of seedWallets) {
    await Wallet.findOneAndUpdate(
      { address: w.address },
      {
        $setOnInsert: {
          address: w.address,
          role: w.role,
          label: w.label,
          balance: w.balance,
        },
      },
      { upsert: true }
    );
  }

  // 3. Ensure Services in Registry
  const seedServices = [
    {
      name: "Books Scraper Pro",
      category: "scraping" as const,
      endpoint: "/api/sellers/scraper",
      price: 50000, // 0.05 USDC
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.scraper,
      schema: {
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
      },
      active: true,
    },
    {
      name: "Budget Scraper (Cheap)",
      category: "scraping" as const,
      endpoint: "/api/sellers/scraper-junk",
      price: 10000, // 0.01 USDC (cheaper, but returns corrupted schema)
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.scraperJunk,
      schema: {
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
      },
      active: true,
    },
    {
      name: "Frankfurter FX Rates",
      category: "fx-rates" as const,
      endpoint: "/api/sellers/fx-rates",
      price: 25000, // 0.025 USDC
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.fxRates,
      schema: {
        type: "object",
        required: ["base", "target", "rate", "date"],
        properties: {
          base: { type: "string" },
          target: { type: "string" },
          rate: { type: "number" },
          date: { type: "string" },
        },
      },
      active: true,
    },
    {
      name: "Hindi AI Summarizer",
      category: "summarization" as const,
      endpoint: "/api/sellers/hindi-summary",
      price: 75000, // 0.075 USDC
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.hindiSummary,
      schema: {
        type: "object",
        required: ["originalText", "hindiSummary", "wordCount"],
        properties: {
          originalText: { type: "string" },
          hindiSummary: { type: "string" },
          wordCount: { type: "number" },
        },
      },
      active: true,
    },
  ];

  for (const s of seedServices) {
    await Service.findOneAndUpdate(
      { endpoint: s.endpoint },
      { $set: s },
      { upsert: true }
    );
  }

  return { buyerAddress, buyerPrivateKey: DEFAULT_BUYER_PK };
}
