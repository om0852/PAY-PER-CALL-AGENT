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
  sentiment: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f".toLowerCase(),
  cryptoOracle: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720".toLowerCase(),
  compliance: "0xBcd4042DE499D14e55001CcbB24a551F3b954096".toLowerCase(),
  reportGen: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788".toLowerCase(),
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
      address: SELLER_WALLETS.sentiment,
      role: "seller" as const,
      label: "Customer Sentiment AI",
      balance: 0,
    },
    {
      address: SELLER_WALLETS.cryptoOracle,
      role: "seller" as const,
      label: "Base L2 Oracle Node",
      balance: 0,
    },
    {
      address: SELLER_WALLETS.compliance,
      role: "seller" as const,
      label: "Compliance & Risk Auditor",
      balance: 0,
    },
    {
      address: SELLER_WALLETS.hindiSummary,
      role: "seller" as const,
      label: "Hindi Translation & Summary AI",
      balance: 0,
    },
    {
      address: SELLER_WALLETS.reportGen,
      role: "seller" as const,
      label: "Executive Report Generator",
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
      name: "Customer Sentiment Analyzer",
      category: "sentiment" as const,
      endpoint: "/api/sellers/sentiment",
      price: 35000, // 0.035 USDC
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.sentiment,
      schema: {
        type: "object",
        required: ["sentiment", "score", "confidence", "highlights"],
        properties: {
          sentiment: { type: "string", enum: ["POSITIVE", "NEUTRAL", "NEGATIVE"] },
          score: { type: "number" },
          confidence: { type: "number" },
          highlights: { type: "array", items: { type: "string" } },
        },
      },
      active: true,
    },
    {
      name: "Crypto & L2 Gas Oracle",
      category: "crypto-oracle" as const,
      endpoint: "/api/sellers/crypto-oracle",
      price: 20000, // 0.02 USDC
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.cryptoOracle,
      schema: {
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
      },
      active: true,
    },
    {
      name: "Compliance & AML Risk Auditor",
      category: "compliance" as const,
      endpoint: "/api/sellers/compliance",
      price: 40000, // 0.04 USDC
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.compliance,
      schema: {
        type: "object",
        required: ["riskScore", "status", "sanctionsClear", "complianceLevel", "auditId"],
        properties: {
          riskScore: { type: "number" },
          status: { type: "string", enum: ["APPROVED", "FLAGGED", "REVIEW_REQUIRED"] },
          sanctionsClear: { type: "boolean" },
          complianceLevel: { type: "string" },
          auditId: { type: "string" },
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
    {
      name: "Executive Dossier Generator",
      category: "reporting" as const,
      endpoint: "/api/sellers/report-generator",
      price: 60000, // 0.06 USDC
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.reportGen,
      schema: {
        type: "object",
        required: ["reportId", "title", "summaryMarkdown", "dataPointsCount", "signedDigest"],
        properties: {
          reportId: { type: "string" },
          title: { type: "string" },
          summaryMarkdown: { type: "string" },
          dataPointsCount: { type: "number" },
          signedDigest: { type: "string" },
        },
      },
      active: true,
    },
    {
      name: "XML to JSON Pro Converter",
      category: "data" as const,
      endpoint: "/api/sellers/xml-to-json",
      price: 30000, // 0.03 USDC
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.reportGen,
      schema: {
        type: "object",
        required: ["success", "rootTag", "data", "elementCount", "convertedAt"],
        properties: {
          success: { type: "boolean" },
          rootTag: { type: "string" },
          data: { type: "object" },
          elementCount: { type: "number" },
          convertedAt: { type: "string" },
        },
      },
      active: true,
    },
    {
      name: "Sentiment & Category Classifier AI",
      category: "sentiment" as const,
      endpoint: "/api/sellers/sentiment-categorizer",
      price: 35000, // 0.035 USDC
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.sentiment,
      schema: {
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
