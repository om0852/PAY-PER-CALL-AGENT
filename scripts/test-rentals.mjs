import assert from "assert";

const BASE_URL = "http://localhost:3000";
const BUYER_WALLET = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

async function runRentalTests() {
  console.log("=================================================");
  console.log("   AGENTBUCKET RENTAL MODEL VERIFICATION SUITE   ");
  console.log("=================================================\n");

  // 1. Verify Service Registry includes Rental metadata
  console.log("▶ Step 1: Querying services registry for rental price & quota...");
  const servicesRes = await fetch(`${BASE_URL}/api/registry/services`);
  assert.strictEqual(servicesRes.status, 200, "Registry must return 200");
  const { services } = await servicesRes.json();
  assert(services.length > 0, "Should have registered services");

  const scraperService = services.find((s) => s.category === "scraping") || services[0];
  console.log(`  Selected Service: "${scraperService.name}" (${scraperService.category})`);
  console.log(`  Per-call price: ${(scraperService.price / 1e6).toFixed(4)} USDC`);
  console.log(`  Monthly rent price: ${(scraperService.rentalPrice / 1e6).toFixed(4)} USDC`);
  console.log(`  Monthly quota: ${scraperService.rentalQuota} calls\n`);

  assert(scraperService.rentalPrice !== undefined, "Service must have rentalPrice");
  assert(scraperService.rentalQuota !== undefined, "Service must have rentalQuota");

  // 2. Test Calling Endpoint WITHOUT Rental Lease (Standard HTTP 402 Challenge)
  console.log("▶ Step 2: Testing unauthenticated request to seller endpoint...");
  const endpointUrl = scraperService.endpoint.startsWith("http")
    ? scraperService.endpoint
    : `${BASE_URL}${scraperService.endpoint}`;
  const challengeRes = await fetch(endpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "fiction", maxResults: 1 }),
  });

  console.log(`  Status code without lease: ${challengeRes.status}`);
  assert.strictEqual(
    challengeRes.status,
    402,
    "Endpoint must challenge with HTTP 402 when no lease and no payment signature provided"
  );
  const challengeAuth = challengeRes.headers.get("x-payment-required") || challengeRes.headers.get("payment-required");
  console.log(`  Challenge header present: ${challengeAuth?.slice(0, 30)}...\n`);
  assert(challengeAuth, "PAYMENT-REQUIRED header must be present on 402");

  // 3. Purchase a 30-Day Rental Lease
  console.log("▶ Step 3: Purchasing 30-day rental lease via POST /api/rentals...");
  const rentRes = await fetch(`${BASE_URL}/api/rentals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyer: BUYER_WALLET,
      serviceId: scraperService.id,
      category: scraperService.category,
      rentalPrice: scraperService.rentalPrice,
      rentalQuota: 10000,
    }),
  });

  assert([200, 201].includes(rentRes.status), `Rental purchase must return 200 or 201, got ${rentRes.status}`);
  const rentData = await rentRes.json();
  console.log(`  Rental Lease ID: ${rentData.rental.id}`);
  console.log(`  Quota Total: ${rentData.rental.quotaTotal} calls`);
  console.log(`  Quota Used: ${rentData.rental.quotaUsed}`);
  console.log(`  Remaining: ${rentData.rental.remainingQuota}\n`);
  assert(rentData.rental.quotaTotal >= 10000, "Quota total should be at least 10000");
  const quotaBefore = rentData.rental.quotaUsed;

  // 4. Test Calling Endpoint WITH Active Rental Lease (Instant 200 Bypass!)
  console.log("▶ Step 4: Calling seller endpoint with active rental lease header (x-buyer-address)...");
  const leasedCallRes = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-buyer-address": BUYER_WALLET,
    },
    body: JSON.stringify({ query: "fiction", maxResults: 1 }),
  });

  console.log(`  Status code with active lease: ${leasedCallRes.status}`);
  assert.strictEqual(
    leasedCallRes.status,
    200,
    `Leased request must return 200 OK directly, got ${leasedCallRes.status}`
  );

  const paymentMode = leasedCallRes.headers.get("x-payment-mode");
  const quotaUsedHeader = leasedCallRes.headers.get("x-rental-quota-used");
  const remainingHeader = leasedCallRes.headers.get("x-rental-remaining");

  console.log(`  X-PAYMENT-MODE: ${paymentMode}`);
  console.log(`  X-RENTAL-QUOTA-USED: ${quotaUsedHeader}`);
  console.log(`  X-RENTAL-REMAINING: ${remainingHeader}`);
  assert.strictEqual(paymentMode, "RENTAL_LEASE", "Payment mode header must be RENTAL_LEASE");
  assert.strictEqual(Number(quotaUsedHeader), quotaBefore + 1, "Quota used must increment by 1");

  const output = await leasedCallRes.json();
  console.log(`  Response payload received: ${JSON.stringify(output).slice(0, 75)}...\n`);
  assert(output.success !== false, "Output must be valid schema");

  // 5. Test Calling a Second Time (Check Atomic Quota Decrement)
  console.log("▶ Step 5: Calling seller endpoint a second time to verify atomic decrement...");
  const secondCallRes = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-buyer-address": BUYER_WALLET,
    },
    body: JSON.stringify({ query: "science", maxResults: 1 }),
  });
  assert.strictEqual(secondCallRes.status, 200);
  const secondQuotaUsed = secondCallRes.headers.get("x-rental-quota-used");
  const secondRemaining = secondCallRes.headers.get("x-rental-remaining");
  console.log(`  X-RENTAL-QUOTA-USED: ${secondQuotaUsed}`);
  console.log(`  X-RENTAL-REMAINING: ${secondRemaining}\n`);
  assert.strictEqual(Number(secondQuotaUsed), quotaBefore + 2, "Quota used must increment by 2");

  // 6. Query GET /api/rentals to check buyer's active leases
  console.log("▶ Step 6: Querying GET /api/rentals?buyer=...");
  const getRentalsRes = await fetch(`${BASE_URL}/api/rentals?buyer=${BUYER_WALLET}`);
  assert.strictEqual(getRentalsRes.status, 200);
  const { rentals } = await getRentalsRes.json();
  console.log(`  Active leases found for buyer: ${rentals.length}`);
  const matchingRental = rentals.find((r) => r.category === scraperService.category);
  assert(matchingRental, "Matching active rental must exist");
  console.log(`  Category: ${matchingRental.category}`);
  console.log(`  Calls remaining: ${matchingRental.remainingQuota} / ${matchingRental.quotaTotal}`);
  console.log(`  Percent used: ${matchingRental.percentUsed}%\n`);

  console.log("=================================================");
  console.log("   ALL RENTAL & LEASE TESTS PASSED PERFECTLY!    ");
  console.log("=================================================");
}

runRentalTests().catch((err) => {
  console.error("❌ Rental test failed:", err);
  process.exit(1);
});
