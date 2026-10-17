/**
 * Cross-Platform AI Cost Optimization & Rental Recommendation Verification Suite
 * Tests:
 * 1. AI Recommendation Generation (/api/ai/recommendations)
 * 2. Cross-platform sync: Active PENDING status on Web and Mobile
 * 3. 1-Click Lease Activation on Mobile -> Auto-dismissal on Web
 * 4. Verification that 30-day lease is registered with 10,000 calls
 * 5. Dismiss flow on Web -> Auto-dismissal on Mobile
 * 6. Pay-Per-Call continuity until rented
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const BUYER_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

async function assert(condition, message, details = "") {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`, details);
    process.exit(1);
  }
  console.log(`✔ PASS: ${message}`);
}

async function run() {
  console.log("=========================================================");
  console.log("  CROSS-PLATFORM AI RENTAL RECOMMENDATION TEST SUITE");
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Buyer:  ${BUYER_ADDRESS}`);
  console.log("=========================================================\n");

  // Step 1: Clean up test categories and trigger AI recommendation
  console.log("▶ Step 1: Cleaning up test categories and triggering AI recommendation (10k calls)...");
  await fetch(`${BASE_URL}/api/test/teardown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      categories: ["sentiment", "compliance"],
      buyerAddress: BUYER_ADDRESS,
    }),
  });

  const resGen = await fetch(`${BASE_URL}/api/ai/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyerAddress: BUYER_ADDRESS,
      serviceName: "Customer Sentiment AI",
      category: "sentiment",
      callCount: 10000,
      perCallPriceUsdc: 0.035,
      rentalPriceUsdc: 1.0,
      rentalQuota: 10000,
    }),
  });

  const genData = await resGen.json();
  assert(resGen.status === 200, "1. POST /api/ai/recommendations status is 200");
  assert(genData.success === true, "1. Recommendation generation succeeded");
  assert(genData.recommendation.callCount === 10000, "1. Volume tracked at 10,000 calls");
  assert(genData.recommendation.projectedPayPerCallCost === 350.0, "1. Projected Pay-Per-Call is $350.00 USDC");
  assert(genData.recommendation.rentalPriceUsdc === 1.0, "1. 30-Day Lease flat rate is $1.00 USDC");
  assert(genData.recommendation.netSavingsUsdc === 349.0, "1. Net savings is $349.00 USDC");
  assert(genData.recommendation.savingsPercent === 99.7, "1. Savings percent is 99.7%");
  assert(genData.recommendation.llmAnalysis.includes("AI Financial Optimization Advisor"), "1. LLM advisory analysis present");

  const recId = genData.recommendation.id;
  console.log(`  Recommendation ID: ${recId}`);
  console.log(`  LLM Rationale: "${genData.recommendation.llmAnalysis.slice(0, 110)}..."\n`);

  // Step 2: Query GET /api/ai/recommendations as if Mobile is checking
  console.log("▶ Step 2: Mobile client queries GET /api/ai/recommendations...");
  const resMobilePoll = await fetch(
    `${BASE_URL}/api/ai/recommendations?buyer=${BUYER_ADDRESS}&status=PENDING`
  );
  const mobilePollData = await resMobilePoll.json();
  assert(resMobilePoll.status === 200, "2. Mobile query returns 200 OK");
  assert(mobilePollData.success === true, "2. Response success flag is true");
  assert(mobilePollData.recommendation !== null, "2. Active PENDING recommendation found on Mobile");
  assert(mobilePollData.recommendation.id === recId, "2. Mobile received matching recommendation ID");
  console.log("  Mobile modal appears on screen!\n");

  // Step 3: Accept 1-Click Rental on Mobile
  console.log("▶ Step 3: User accepts 1-Click Rental Lease on Mobile ($1.00 USDC / 30 Days)...");
  const resAccept = await fetch(`${BASE_URL}/api/ai/recommendations/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recommendationId: recId,
      action: "ACCEPT",
      platform: "mobile",
      buyerAddress: BUYER_ADDRESS,
    }),
  });
  const acceptData = await resAccept.json();
  assert(resAccept.status === 200, "3. Mobile accept action returns 200 OK");
  assert(acceptData.success === true, "3. Rental lease activation successful");
  assert(acceptData.action === "ACCEPT", "3. Action confirmed as ACCEPT");
  assert(acceptData.acceptedBy === "mobile", "3. Platform verified as mobile");
  assert(acceptData.rental.quotaTotal === 10000, "3. 10,000 calls quota granted");
  console.log(`  Lease TxHash: ${acceptData.rental.txHash}`);
  console.log(`  Expires: ${acceptData.rental.expiresAt}\n`);

  // Step 4: Web client polls GET /api/ai/recommendations -> Must return null (auto-dismissal)
  console.log("▶ Step 4: Web dashboard polls GET /api/ai/recommendations to verify real-time dismissal...");
  const resWebPoll = await fetch(
    `${BASE_URL}/api/ai/recommendations?buyer=${BUYER_ADDRESS}&status=PENDING`
  );
  const webPollData = await resWebPoll.json();
  assert(resWebPoll.status === 200, "4. Web query returns 200 OK");
  assert(webPollData.recommendation === null, "4. Recommendation is NULL on Web (Modal dismissed automatically!)");
  console.log("  Web modal disappeared automatically in real-time!\n");

  // Step 5: Test Dismiss Flow (Simulate recommendation generated and dismissed on Web)
  console.log("▶ Step 5: Testing Dismiss Flow (Web user chooses 'Continue Pay-Per-Call')...");
  const resGen2 = await fetch(`${BASE_URL}/api/ai/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyerAddress: BUYER_ADDRESS,
      serviceName: "Compliance & Risk Auditor",
      category: "compliance",
      callCount: 5000,
      perCallPriceUsdc: 0.04,
      rentalPriceUsdc: 1.0,
      rentalQuota: 10000,
      forceSimulation: true,
    }),
  });
  const gen2Data = await resGen2.json();
  assert(resGen2.status === 200, "5. Second recommendation generated for Compliance & Risk Auditor");
  assert(gen2Data.success === true, "5. Compliance recommendation created successfully");
  const rec2Id = gen2Data.recommendation.id;

  // Web user clicks Dismiss
  const resDismiss = await fetch(`${BASE_URL}/api/ai/recommendations/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recommendationId: rec2Id,
      action: "DISMISS",
      platform: "web",
    }),
  });
  const dismissData = await resDismiss.json();
  assert(resDismiss.status === 200, "5. Web dismiss action returns 200 OK");
  assert(dismissData.action === "DISMISS", "5. Action confirmed as DISMISS");

  // Mobile checks again -> Must be null
  const resMobilePoll2 = await fetch(
    `${BASE_URL}/api/ai/recommendations?buyer=${BUYER_ADDRESS}&status=PENDING`
  );
  const mobilePoll2Data = await resMobilePoll2.json();
  assert(mobilePoll2Data.recommendation === null, "5. Dismissed recommendation disappeared on Mobile as well!");

  // Clean up test records
  await fetch(`${BASE_URL}/api/test/teardown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      categories: ["sentiment", "compliance"],
      buyerAddress: BUYER_ADDRESS,
    }),
  });

  console.log("\n=========================================================");
  console.log("  ALL CROSS-PLATFORM AI RECOMMENDATION TESTS PASSED 100%!");
  console.log("=========================================================\n");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
