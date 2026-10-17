import fs from "fs";
import mongoose from "mongoose";

const env = fs.readFileSync(".env.local", "utf-8");
const match = env.match(/MONGODB_URI=(.*)/);
const uri = match[1].trim();

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // 1. Update scraper services with exact rating and review counts
  await db.collection("services").updateOne(
    { endpoint: "/api/sellers/scraper-legacy" },
    { $set: { averageUserRating: 1.2, totalRatingsCount: 9 } }
  );
  await db.collection("services").updateOne(
    { endpoint: "/api/sellers/scraper-unstable" },
    { $set: { averageUserRating: 1.8, totalRatingsCount: 14 } }
  );

  // 2. Update all seed negative review entries in ledgers collection with userRating & feedback
  const negativeReviews = [
    {
      taskId: "task-seed-leg-01",
      buyer: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      seller: "0x1111111111111111111111111111111111111111",
      serviceName: "Legacy Web Harvester v1",
      category: "scraping",
      listedPrice: 15000,
      askedPrice: 0,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_DOWNSTREAM",
      latencyMs: 6012,
      userRating: 1,
      ratingFeedback: "503 Service Unavailable constantly. Cluster nodes down for over 48 hours.",
      createdAt: new Date(Date.now() - 3600000 * 24),
    },
    {
      taskId: "task-seed-leg-02",
      buyer: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      seller: "0x1111111111111111111111111111111111111111",
      serviceName: "Legacy Web Harvester v1",
      category: "scraping",
      listedPrice: 15000,
      askedPrice: 0,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_DOWNSTREAM",
      latencyMs: 5800,
      userRating: 1,
      ratingFeedback: "Gateway timed out on travel books catalogue. Unreliable, avoid in production.",
      createdAt: new Date(Date.now() - 3600000 * 18),
    },
    {
      taskId: "task-seed-leg-03",
      buyer: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      seller: "0x1111111111111111111111111111111111111111",
      serviceName: "Legacy Web Harvester v1",
      category: "scraping",
      listedPrice: 15000,
      askedPrice: 0,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_OUTPUT_REJECTED",
      latencyMs: 4200,
      userRating: 2,
      ratingFeedback: "High latency and frequent connection drops. Forced failover to Books Scraper Pro.",
      createdAt: new Date(Date.now() - 3600000 * 6),
    },
    {
      taskId: "task-seed-unst-01",
      buyer: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      seller: "0x2222222222222222222222222222222222222222",
      serviceName: "FastScrape Cloud (Unstable)",
      category: "scraping",
      listedPrice: 20000,
      askedPrice: 20000,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_OUTPUT_REJECTED",
      latencyMs: 92,
      userRating: 1,
      ratingFeedback: "Returns Cloudflare bot challenge HTML page instead of parsed book list! Crashed downstream agent.",
      createdAt: new Date(Date.now() - 3600000 * 20),
    },
    {
      taskId: "task-seed-unst-02",
      buyer: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      seller: "0x2222222222222222222222222222222222222222",
      serviceName: "FastScrape Cloud (Unstable)",
      category: "scraping",
      listedPrice: 20000,
      askedPrice: 20000,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_OUTPUT_REJECTED",
      latencyMs: 88,
      userRating: 2,
      ratingFeedback: "Schema validation failure: Missing price and rating properties in output payload.",
      createdAt: new Date(Date.now() - 3600000 * 12),
    },
    {
      taskId: "task-seed-unst-03",
      buyer: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      seller: "0x2222222222222222222222222222222222222222",
      serviceName: "FastScrape Cloud (Unstable)",
      category: "scraping",
      listedPrice: 20000,
      askedPrice: 20000,
      paidPrice: 0,
      txHash: null,
      status: "FAILED_OUTPUT_REJECTED",
      latencyMs: 110,
      userRating: 2,
      ratingFeedback: "Intermittent bot block errors and malformed output. Not recommended.",
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
  ];

  for (const r of negativeReviews) {
    await db.collection("ledgers").updateOne(
      { taskId: r.taskId },
      { $set: r },
      { upsert: true }
    );
  }

  const doc1 = await db.collection("services").findOne({ endpoint: "/api/sellers/scraper-legacy" });
  const doc2 = await db.collection("services").findOne({ endpoint: "/api/sellers/scraper-unstable" });
  console.log("Legacy in DB:", doc1.name, "| Rating:", doc1.averageUserRating, "| Reviews:", doc1.totalRatingsCount);
  console.log("Unstable in DB:", doc2.name, "| Rating:", doc2.averageUserRating, "| Reviews:", doc2.totalRatingsCount);

  const ratedLogs = await db.collection("ledgers").find({ userRating: { $ne: null } }).toArray();
  console.log("Total rated reviews in ledgers:", ratedLogs.length);
  for (const log of ratedLogs) {
    console.log(`- [${log.serviceName}] ★ ${log.userRating}/5: "${log.ratingFeedback}"`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
