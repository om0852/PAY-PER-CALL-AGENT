import { connectToDatabase } from "../mongodb";
import Wallet from "../models/Wallet";
import Service from "../models/Service";
import Ledger from "../models/Ledger";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// Deterministic or generated buyer private key
const DEFAULT_BUYER_PK =
  (process.env.BUYER_PRIVATE_KEY as `0x${string}`) ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil #0 well known testnet key

export const SELLER_WALLETS = {
  scraper: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
  scraperJunk: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(),
  scraperLegacy: "0x1111111111111111111111111111111111111111".toLowerCase(),
  scraperUnstable: "0x2222222222222222222222222222222222222222".toLowerCase(),
  fxRates: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".toLowerCase(),
  hindiSummary: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65".toLowerCase(),
  sentiment: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f".toLowerCase(),
  cryptoOracle: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720".toLowerCase(),
  compliance: "0xBcd4042DE499D14e55001CcbB24a551F3b954096".toLowerCase(),
  reportGen: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788".toLowerCase(),
  scraperFast: "0x4444444444444444444444444444444444444444".toLowerCase(),
  scraperEnterprise: "0x8888888888888888888888888888888888888888".toLowerCase(),
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
      address: SELLER_WALLETS.scraperLegacy,
      role: "seller" as const,
      label: "Legacy Web Harvester (Unmaintained)",
      balance: 0,
    },
    {
      address: SELLER_WALLETS.scraperUnstable,
      role: "seller" as const,
      label: "FastScrape Cloud (Unstable)",
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
    {
      address: SELLER_WALLETS.scraperFast,
      role: "seller" as const,
      label: "Cheerio FastScraper Standard",
      balance: 0,
    },
    {
      address: SELLER_WALLETS.scraperEnterprise,
      role: "seller" as const,
      label: "Enterprise BookScraper Ultra",
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
    {
      name: "Legacy Web Harvester v1",
      category: "scraping" as const,
      endpoint: "/api/sellers/scraper-legacy",
      price: 15000, // 0.015 USDC
      rentalPrice: 500000,
      rentalQuota: 10000,
      rentalDurationDays: 30,
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.scraperLegacy,
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
      health: {
        status: "DOWN" as const,
        lastChecked: new Date(),
        latencyMs: 0,
        message: "Endpoint returned server error HTTP 503 (Legacy cluster unreachable).",
      },
      averageUserRating: 1.2,
      totalRatingsCount: 9,
      active: true,
    },
    {
      name: "FastScrape Cloud (Unstable)",
      category: "scraping" as const,
      endpoint: "/api/sellers/scraper-unstable",
      price: 20000, // 0.02 USDC
      rentalPrice: 600000,
      rentalQuota: 10000,
      rentalDurationDays: 30,
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.scraperUnstable,
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
      health: {
        status: "SCHEMA_MISMATCH" as const,
        lastChecked: new Date(),
        latencyMs: 84,
        message: "Output fails registered JSON Schema: data must be array (Cloudflare block).",
      },
      averageUserRating: 1.8,
      totalRatingsCount: 14,
      active: true,
    },
    {
      name: "Cheerio FastScraper Standard",
      category: "scraping" as const,
      endpoint: "/api/sellers/scraper-fast",
      price: 35000, // 0.035 USDC
      rentalPrice: 700000, // 0.70 USDC
      rentalQuota: 10000,
      rentalDurationDays: 30,
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.scraperFast,
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
      health: {
        status: "HEALTHY" as const,
        lastChecked: new Date(),
        latencyMs: 142,
        message: "Endpoint responsive, full schema compliance verified.",
      },
      averageUserRating: 4.8,
      totalRatingsCount: 28,
      active: true,
    },
    {
      name: "Enterprise BookScraper Ultra",
      category: "scraping" as const,
      endpoint: "/api/sellers/scraper-enterprise",
      price: 75000, // 0.075 USDC
      rentalPrice: 1500000, // 1.50 USDC
      rentalQuota: 25000,
      rentalDurationDays: 30,
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      payTo: SELLER_WALLETS.scraperEnterprise,
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
      health: {
        status: "HEALTHY" as const,
        lastChecked: new Date(),
        latencyMs: 98,
        message: "High-throughput enterprise proxy cluster verified.",
      },
      averageUserRating: 4.9,
      totalRatingsCount: 64,
      active: true,
    },
  ];

  // Clean up any test junk records (e.g. "ddd" or invalid endpoints)
  await Service.deleteMany({
    $or: [
      { name: "ddd" },
      { endpoint: "ddd" },
      { endpoint: { $not: { $regex: "^/api/" } } },
    ],
  });

  // Deduplicate and upsert all seed services using findOneAndUpdate to avoid Mongoose reserved 'schema' property collision
  for (const s of seedServices) {
    const existing = await Service.find({
      $or: [{ endpoint: s.endpoint }, { name: s.name }],
    });

    if (existing.length > 1) {
      const [primary, ...duplicates] = existing;
      const dupIds = duplicates.map((d) => d._id);
      await Service.deleteMany({ _id: { $in: dupIds } });
    }

    await Service.collection.updateOne(
      { endpoint: s.endpoint },
      { $set: s },
      { upsert: true }
    );
  }

  // Seed realistic negative audit reviews in Ledger for the bad/unstable scrapers
  const negativeReviews = [
    {
      taskId: "task-seed-leg-01",
      buyer: buyerAddress,
      seller: SELLER_WALLETS.scraperLegacy,
      serviceName: "Legacy Web Harvester v1",
      category: "scraping",
      listedPrice: 15000,
      askedPrice: 0,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_DOWNSTREAM" as const,
      latencyMs: 6012,
      userRating: 1,
      ratingFeedback: "503 Service Unavailable constantly. Cluster nodes down for over 48 hours.",
      createdAt: new Date(Date.now() - 3600000 * 24),
    },
    {
      taskId: "task-seed-leg-02",
      buyer: buyerAddress,
      seller: SELLER_WALLETS.scraperLegacy,
      serviceName: "Legacy Web Harvester v1",
      category: "scraping",
      listedPrice: 15000,
      askedPrice: 0,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_DOWNSTREAM" as const,
      latencyMs: 5800,
      userRating: 1,
      ratingFeedback: "Gateway timed out on travel books catalogue. Unreliable, avoid in production.",
      createdAt: new Date(Date.now() - 3600000 * 18),
    },
    {
      taskId: "task-seed-leg-03",
      buyer: buyerAddress,
      seller: SELLER_WALLETS.scraperLegacy,
      serviceName: "Legacy Web Harvester v1",
      category: "scraping",
      listedPrice: 15000,
      askedPrice: 0,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_OUTPUT_REJECTED" as const,
      latencyMs: 4200,
      userRating: 2,
      ratingFeedback: "High latency and frequent connection drops. Forced failover to Books Scraper Pro.",
      createdAt: new Date(Date.now() - 3600000 * 6),
    },
    {
      taskId: "task-seed-unst-01",
      buyer: buyerAddress,
      seller: SELLER_WALLETS.scraperUnstable,
      serviceName: "FastScrape Cloud (Unstable)",
      category: "scraping",
      listedPrice: 20000,
      askedPrice: 20000,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_OUTPUT_REJECTED" as const,
      latencyMs: 92,
      userRating: 1,
      ratingFeedback: "Returns Cloudflare bot challenge HTML page instead of parsed book list! Crashed downstream agent.",
      createdAt: new Date(Date.now() - 3600000 * 20),
    },
    {
      taskId: "task-seed-unst-02",
      buyer: buyerAddress,
      seller: SELLER_WALLETS.scraperUnstable,
      serviceName: "FastScrape Cloud (Unstable)",
      category: "scraping",
      listedPrice: 20000,
      askedPrice: 20000,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_OUTPUT_REJECTED" as const,
      latencyMs: 88,
      userRating: 2,
      ratingFeedback: "Schema validation failure: Missing price and rating properties in output payload.",
      createdAt: new Date(Date.now() - 3600000 * 12),
    },
    {
      taskId: "task-seed-unst-03",
      buyer: buyerAddress,
      seller: SELLER_WALLETS.scraperUnstable,
      serviceName: "FastScrape Cloud (Unstable)",
      category: "scraping",
      listedPrice: 20000,
      askedPrice: 20000,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_OUTPUT_REJECTED" as const,
      latencyMs: 110,
      userRating: 2,
      ratingFeedback: "Intermittent bot block errors and malformed output. Not recommended.",
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
  ];

  for (const r of negativeReviews) {
    await Ledger.collection.updateOne(
      { taskId: r.taskId },
      { $set: r },
      { upsert: true }
    );
  }

  return { buyerAddress, buyerPrivateKey: DEFAULT_BUYER_PK };
}
