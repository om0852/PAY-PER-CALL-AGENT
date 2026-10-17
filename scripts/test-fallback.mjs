// Test fallback execution via /api/buyer/run
async function run() {
  const prompt = "Scrape books inventory using Budget Scraper ($0.01 USDC), detect schema mismatch, and fallback to verified Cheerio FastScraper ($0.035 USDC).";
  console.log("Testing Fallback with prompt:", prompt);
  
  const res = await fetch("http://localhost:3000/api/buyer/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: prompt,
      budget: 250000, // 0.25 USDC
      maxConcurrency: 2,
    }),
  });

  const data = await res.json();
  console.log("Status Code:", res.status);
  console.log("Fallback Used:", data.fallbackUsed);
  console.log("Fallback Details:", JSON.stringify(data.fallbackDetails, null, 2));
  console.log("Summary:", data.summary);
  console.log("Purchases:", data.purchases?.map(p => ({
    service: p.service,
    price: p.price,
    status: p.status,
    latency: p.latency
  })));
  console.log("Total Spent:", (data.totalSpent / 1e6).toFixed(4), "USDC");
}

run().catch(console.error);
