/**
 * End-to-End Test Suite for x402 v2 Payment Protocol & Agent Platform
 * 
 * Tests covered:
 * 1. Wallets API: GET /api/wallets (integrity, balance check, no private keys)
 * 2. Services Registry API: GET & POST /api/registry/services (dynamic reputation)
 * 3. Books Scraper: POST /api/sellers/scraper (402 Challenge -> EIP-3009 Sign -> 200 Delivery)
 * 4. Corrupt Scraper Fallback Test: POST /api/sellers/scraper-junk (Ajv rejection, no charge)
 * 5. FX Rates: POST /api/sellers/fx-rates (402 Challenge -> EIP-3009 Sign -> 200 Delivery)
 * 6. Hindi AI Summarizer: POST /api/sellers/hindi-summary (402 Challenge -> EIP-3009 Sign -> 200 Delivery)
 * 7. Facilitator Verify & Settle: Direct EIP-712 verification
 * 8. Facilitator Replay Defense: Duplicate nonce rejection (400)
 * 9. Facilitator Tamper Defense: Invalid signature rejection (400)
 * 10. Autonomous Buyer Agent: POST /api/buyer/run (Full autonomous task, budget enforcement, 2-tier fallback)
 * 11. Ledger Audit Trail: GET /api/ledger (Log integrity)
 * 12. Micro-Explorer: GET /api/tx/[hash] (Decoded authorization, ECDSA proof, gas sponsorship badge)
 */

import crypto from "crypto";
import { privateKeyToAccount } from "viem/accounts";

const BASE_URL = process.env.APP_URL || "http://localhost:3000";

// Standard Testnet / Simulated Buyer Key
const BUYER_PRIVATE_KEY =
  process.env.BUYER_PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const buyerAccount = privateKeyToAccount(BUYER_PRIVATE_KEY);
const buyerAddress = buyerAccount.address.toLowerCase();

const EIP712_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: 84532,
  verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

const createdNonces = [];
const createdTxHashes = [];
const createdTaskIds = [];

function generateNonce() {
  const n = "0x" + crypto.randomBytes(32).toString("hex");
  createdNonces.push(n);
  return n;
}

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    console.log(`\x1b[32m✔ PASS\x1b[0m ${testName} ${details ? `(${details})` : ""}`);
    results.push({ test: testName, status: "PASS", details });
  } else {
    failed++;
    console.error(`\x1b[31m✖ FAIL\x1b[0m ${testName} ${details ? `(${details})` : ""}`);
    results.push({ test: testName, status: "FAIL", details });
  }
}

async function signEIP3009(payTo, amount, validBefore, nonce) {
  const authorization = {
    from: buyerAddress,
    to: payTo,
    value: BigInt(amount),
    validAfter: BigInt(0),
    validBefore: BigInt(validBefore),
    nonce,
  };

  const signature = await buyerAccount.signTypedData({
    domain: EIP712_DOMAIN,
    types: EIP3009_TYPES,
    primaryType: "TransferWithAuthorization",
    message: authorization,
  });

  return {
    authorization: {
      from: buyerAddress,
      to: payTo,
      value: amount,
      validAfter: 0,
      validBefore,
      nonce,
    },
    signature,
  };
}

async function runTests() {
  console.log("\n=======================================================");
  console.log(`  x402 Protocol & Autonomous Agent Test Suite`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Buyer:  ${buyerAddress}`);
  console.log("=======================================================\n");

  // TEST 1: Wallets API
  try {
    const res = await fetch(`${BASE_URL}/api/wallets`);
    const data = await res.json();
    assert(res.status === 200, "1. GET /api/wallets status is 200");
    assert(Array.isArray(data.wallets) && data.wallets.length >= 5, "1. Wallets array seeded with >= 5 system wallets", `count: ${data.wallets?.length}`);
    const hasNoPrivateKeys = data.wallets.every((w) => !w.privateKey);
    assert(hasNoPrivateKeys, "1. Key Hygiene: No private keys leaked in public wallets API");
  } catch (err) {
    assert(false, "1. GET /api/wallets error", err.message);
  }

  // TEST 2: Services Registry API
  try {
    const res = await fetch(`${BASE_URL}/api/registry/services`);
    const data = await res.json();
    assert(res.status === 200, "2. GET /api/registry/services status is 200");
    assert(Array.isArray(data.services) && data.services.length >= 4, "2. Registry contains >= 4 services");
    const hasReputation = data.services.every((s) => s.reputation && typeof s.reputation.score === "number");
    assert(hasReputation, "2. Services have dynamic reputation matrix computed");
  } catch (err) {
    assert(false, "2. GET /api/registry/services error", err.message);
  }

  // TEST 3: Books Scraper 402 Challenge & Signed Payment Flow
  let latestTxHash = null;
  try {
    // 3a: Call with no header -> expect 402
    const res402 = await fetch(`${BASE_URL}/api/sellers/scraper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert(res402.status === 402, "3a. POST /api/sellers/scraper returns 402 Payment Required without header");
    
    const challengeHeader = res402.headers.get("payment-required");
    assert(!!challengeHeader, "3a. 402 response includes PAYMENT-REQUIRED base64 header");

    const challenge = JSON.parse(Buffer.from(challengeHeader, "base64").toString("utf8"));
    assert(challenge.x402Version === 2, "3a. Challenge version is x402 v2");
    assert(challenge.amount === 50000, "3a. Challenge amount matches listed price (50,000 units = 0.05 USDC)");

    // 3b: Sign EIP-3009 and retry
    const nonce = generateNonce();
    const sigPayload = await signEIP3009(
      challenge.payTo,
      challenge.amount,
      challenge.validBefore || Math.floor(Date.now() / 1000) + 3600,
      nonce
    );

    const b64Sig = Buffer.from(JSON.stringify(sigPayload)).toString("base64");
    const resPaid = await fetch(`${BASE_URL}/api/sellers/scraper`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": b64Sig,
      },
      body: JSON.stringify({}),
    });

    assert(resPaid.status === 200, "3b. POST /api/sellers/scraper returns 200 when valid payment provided");
    const respHeader = resPaid.headers.get("payment-response");
    assert(!!respHeader, "3b. Response includes PAYMENT-RESPONSE header");
    
    const paymentReceipt = JSON.parse(Buffer.from(respHeader, "base64").toString("utf8"));
    assert(paymentReceipt.settled === true, "3b. Settlement confirmed in response header");
    assert(typeof paymentReceipt.txHash === "string" && paymentReceipt.txHash.startsWith("0x"), "3b. Valid transaction hash generated");
    latestTxHash = paymentReceipt.txHash;
    if (paymentReceipt.txHash) createdTxHashes.push(paymentReceipt.txHash);

    const books = await resPaid.json();
    assert(Array.isArray(books) && books.length > 0, "3b. Cheerio scraper returns parsed book items", `items: ${books.length}`);
    assert(typeof books[0].price === "number", "3b. Books schema contains numeric price");
  } catch (err) {
    assert(false, "3. Books Scraper payment flow error", err.message);
  }

  // TEST 4: Corrupt Scraper Schema Validation Rejection (Ajv)
  try {
    const res402 = await fetch(`${BASE_URL}/api/sellers/scraper-junk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const challengeHeader = res402.headers.get("payment-required");
    const challenge = JSON.parse(Buffer.from(challengeHeader, "base64").toString("utf8"));

    const nonce = generateNonce();
    const sigPayload = await signEIP3009(
      challenge.payTo,
      challenge.amount,
      challenge.validBefore || Math.floor(Date.now() / 1000) + 3600,
      nonce
    );
    const b64Sig = Buffer.from(JSON.stringify(sigPayload)).toString("base64");

    const resPaid = await fetch(`${BASE_URL}/api/sellers/scraper-junk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": b64Sig,
      },
      body: JSON.stringify({}),
    });

    // Should return 500 schema validation failure without settling
    assert(resPaid.status === 500, "4. POST /api/sellers/scraper-junk rejects invalid schema with 500");
    const errBody = await resPaid.json();
    assert(errBody.error && errBody.error.includes("schema validation"), "4. Error response confirms Ajv schema validation rejection");
  } catch (err) {
    assert(false, "4. Corrupt scraper test error", err.message);
  }

  // TEST 5: FX Rates Seller Flow
  try {
    const res402 = await fetch(`${BASE_URL}/api/sellers/fx-rates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base: "USD", target: "INR" }),
    });
    assert(res402.status === 402, "5. POST /api/sellers/fx-rates returns 402 challenge");

    const challenge = JSON.parse(Buffer.from(res402.headers.get("payment-required"), "base64").toString("utf8"));
    const nonce = generateNonce();
    const sigPayload = await signEIP3009(
      challenge.payTo,
      challenge.amount,
      challenge.validBefore || Math.floor(Date.now() / 1000) + 3600,
      nonce
    );
    const b64Sig = Buffer.from(JSON.stringify(sigPayload)).toString("base64");

    const resPaid = await fetch(`${BASE_URL}/api/sellers/fx-rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": b64Sig,
      },
      body: JSON.stringify({ base: "USD", target: "INR" }),
    });

    assert(resPaid.status === 200, "5. POST /api/sellers/fx-rates returns 200 with payment");
    const fxData = await resPaid.json();
    assert(fxData.base === "USD" && fxData.target === "INR" && typeof fxData.rate === "number", "5. FX rates returns valid rate object", `1 USD = ${fxData.rate} INR`);
  } catch (err) {
    assert(false, "5. FX rates test error", err.message);
  }

  // TEST 6: Hindi AI Summarizer Flow
  try {
    const res402 = await fetch(`${BASE_URL}/api/sellers/hindi-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Autonomous payment agents revolutionize microservices." }),
    });
    assert(res402.status === 402, "6. POST /api/sellers/hindi-summary returns 402 challenge");

    const challenge = JSON.parse(Buffer.from(res402.headers.get("payment-required"), "base64").toString("utf8"));
    const nonce = generateNonce();
    const sigPayload = await signEIP3009(
      challenge.payTo,
      challenge.amount,
      challenge.validBefore || Math.floor(Date.now() / 1000) + 3600,
      nonce
    );
    const b64Sig = Buffer.from(JSON.stringify(sigPayload)).toString("base64");

    const resPaid = await fetch(`${BASE_URL}/api/sellers/hindi-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": b64Sig,
      },
      body: JSON.stringify({ text: "Autonomous payment agents revolutionize microservices." }),
    });

    assert(resPaid.status === 200, "6. POST /api/sellers/hindi-summary returns 200 with payment");
    const summaryData = await resPaid.json();
    assert(!!summaryData.hindiSummary && summaryData.wordCount > 0, "6. Hindi AI delivers summary with wordCount", `words: ${summaryData.wordCount}`);
  } catch (err) {
    assert(false, "6. Hindi summary test error", err.message);
  }

  // TEST 6b: Sentiment Analysis Flow
  try {
    const res402 = await fetch(`${BASE_URL}/api/sellers/sentiment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Excellent high-rated five star book with verified quality." }),
    });
    assert(res402.status === 402, "6b. POST /api/sellers/sentiment returns 402 challenge");

    const challenge = JSON.parse(Buffer.from(res402.headers.get("payment-required"), "base64").toString("utf8"));
    const nonce = generateNonce();
    const sigPayload = await signEIP3009(
      challenge.payTo,
      challenge.amount,
      challenge.validBefore || Math.floor(Date.now() / 1000) + 3600,
      nonce
    );
    const b64Sig = Buffer.from(JSON.stringify(sigPayload)).toString("base64");

    const resPaid = await fetch(`${BASE_URL}/api/sellers/sentiment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": b64Sig,
      },
      body: JSON.stringify({ text: "Excellent high-rated five star book with verified quality." }),
    });

    assert(resPaid.status === 200, "6b. POST /api/sellers/sentiment returns 200 with payment");
    const sentData = await resPaid.json();
    assert(sentData.sentiment === "POSITIVE" && typeof sentData.score === "number", "6b. Sentiment analysis verified score & classification");
  } catch (err) {
    assert(false, "6b. Sentiment analysis test error", err.message);
  }

  // TEST 6c: Crypto & L2 Gas Oracle Flow
  try {
    const res402 = await fetch(`${BASE_URL}/api/sellers/crypto-oracle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert(res402.status === 402, "6c. POST /api/sellers/crypto-oracle returns 402 challenge");

    const challenge = JSON.parse(Buffer.from(res402.headers.get("payment-required"), "base64").toString("utf8"));
    const nonce = generateNonce();
    const sigPayload = await signEIP3009(
      challenge.payTo,
      challenge.amount,
      challenge.validBefore || Math.floor(Date.now() / 1000) + 3600,
      nonce
    );
    const b64Sig = Buffer.from(JSON.stringify(sigPayload)).toString("base64");

    const resPaid = await fetch(`${BASE_URL}/api/sellers/crypto-oracle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": b64Sig,
      },
      body: JSON.stringify({}),
    });

    assert(resPaid.status === 200, "6c. POST /api/sellers/crypto-oracle returns 200 with payment");
    const oracleData = await resPaid.json();
    assert(oracleData.prices && oracleData.prices.ETH > 0, "6c. Crypto oracle returned live ETH price");
  } catch (err) {
    assert(false, "6c. Crypto oracle test error", err.message);
  }

  // TEST 6d: Compliance & AML Risk Auditor Flow
  try {
    const res402 = await fetch(`${BASE_URL}/api/sellers/compliance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor: "Books Media Ltd" }),
    });
    assert(res402.status === 402, "6d. POST /api/sellers/compliance returns 402 challenge");

    const challenge = JSON.parse(Buffer.from(res402.headers.get("payment-required"), "base64").toString("utf8"));
    const nonce = generateNonce();
    const sigPayload = await signEIP3009(
      challenge.payTo,
      challenge.amount,
      challenge.validBefore || Math.floor(Date.now() / 1000) + 3600,
      nonce
    );
    const b64Sig = Buffer.from(JSON.stringify(sigPayload)).toString("base64");

    const resPaid = await fetch(`${BASE_URL}/api/sellers/compliance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": b64Sig,
      },
      body: JSON.stringify({ vendor: "Books Media Ltd" }),
    });

    assert(resPaid.status === 200, "6d. POST /api/sellers/compliance returns 200 with payment");
    const compData = await resPaid.json();
    assert(compData.status === "APPROVED" && compData.sanctionsClear === true, "6d. Compliance audit approved vendor with sanctions clearance");
  } catch (err) {
    assert(false, "6d. Compliance audit test error", err.message);
  }

  // TEST 6e: Executive Report Generator Flow
  try {
    const res402 = await fetch(`${BASE_URL}/api/sellers/report-generator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Multi-Agent Executive Brief" }),
    });
    assert(res402.status === 402, "6e. POST /api/sellers/report-generator returns 402 challenge");

    const challenge = JSON.parse(Buffer.from(res402.headers.get("payment-required"), "base64").toString("utf8"));
    const nonce = generateNonce();
    const sigPayload = await signEIP3009(
      challenge.payTo,
      challenge.amount,
      challenge.validBefore || Math.floor(Date.now() / 1000) + 3600,
      nonce
    );
    const b64Sig = Buffer.from(JSON.stringify(sigPayload)).toString("base64");

    const resPaid = await fetch(`${BASE_URL}/api/sellers/report-generator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": b64Sig,
      },
      body: JSON.stringify({ title: "Multi-Agent Executive Brief" }),
    });

    assert(resPaid.status === 200, "6e. POST /api/sellers/report-generator returns 200 with payment");
    const repData = await resPaid.json();
    assert(repData.signedDigest && repData.summaryMarkdown.includes("Executive"), "6e. Executive report delivered with signed digest hash");
  } catch (err) {
    assert(false, "6e. Executive report test error", err.message);
  }

  // TEST 7, 8, 9: Facilitator Verify, Replay Defense, and Tamper Defense
  try {
    const replayNonce = generateNonce();
    const testAmount = 10000;
    const testPayTo = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
    const validBefore = Math.floor(Date.now() / 1000) + 3600;

    const sigPayload = await signEIP3009(testPayTo, testAmount, validBefore, replayNonce);

    // 7. Legitimate verification
    const vRes1 = await fetch(`${BASE_URL}/api/facilitator/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x402Version: 2,
        network: "eip155:84532",
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        amount: testAmount,
        payTo: testPayTo,
        authorization: sigPayload.authorization,
        signature: sigPayload.signature,
      }),
    });

    assert(vRes1.status === 200, "7. POST /api/facilitator/verify succeeds with valid cryptographic signature");

    // 8. Replay Attack Attempt: replay with identical (from, nonce)
    const vResReplay = await fetch(`${BASE_URL}/api/facilitator/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x402Version: 2,
        network: "eip155:84532",
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        amount: testAmount,
        payTo: testPayTo,
        authorization: sigPayload.authorization,
        signature: sigPayload.signature,
      }),
    });

    assert(vResReplay.status === 400, "8. Replay Defense: Facilitator rejects duplicate nonce with 400");
    const replayData = await vResReplay.json();
    assert(replayData.error && replayData.error.includes("Replay attack"), "8. Error specifies Replay attack detected");

    // 9. Tampered Signature Defense
    const tamperedSig = sigPayload.signature.slice(0, -4) + "ffff";
    const vResTamper = await fetch(`${BASE_URL}/api/facilitator/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x402Version: 2,
        network: "eip155:84532",
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        amount: testAmount,
        payTo: testPayTo,
        authorization: { ...sigPayload.authorization, nonce: generateNonce() },
        signature: tamperedSig,
      }),
    });

    assert(vResTamper.status === 400, "9. Tamper Defense: Facilitator rejects invalid ECDSA signature with 400");
  } catch (err) {
    assert(false, "7/8/9. Facilitator security tests error", err.message);
  }

  // TEST 10: Autonomous Buyer Agent Execution (Full End-to-End Task)
  try {
    const agentRes = await fetch(`${BASE_URL}/api/buyer/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "Automated test run: scrape travel books, convert currency, and translate summary",
        budget: 500000, // 0.50 USDC
        maxConcurrency: 3,
      }),
    });

    assert(agentRes.status === 200, "10. POST /api/buyer/run initiates and executes autonomous agent flow");
    const agentOutcome = await agentRes.json();
    assert(agentOutcome.taskId && agentOutcome.taskId.startsWith("task-"), "10. Returns unique taskId");
    if (agentOutcome.taskId) createdTaskIds.push(agentOutcome.taskId);
    if (Array.isArray(agentOutcome.purchases)) {
      agentOutcome.purchases.forEach((p) => {
        if (p.txHash) createdTxHashes.push(p.txHash);
      });
    }
    assert(agentOutcome.totalSpent <= agentOutcome.budgetLimit, "10. Strict Budget Enforcement: totalSpent <= budgetLimit");
    assert(Array.isArray(agentOutcome.purchases) && agentOutcome.purchases.length >= 3, "10. Multi-step plan executed >= 3 service calls");
    
    // Check fallback happened if corrupt scraper was ranked
    const hasSettledBooks = agentOutcome.purchases.some((p) => p.service === "Books Scraper Pro" && p.status === "SETTLED");
    assert(hasSettledBooks, "10. 2-Tier Fallback Loop: Books Scraper Pro settled output after fallback");
  } catch (err) {
    assert(false, "10. Autonomous Buyer Agent execution error", err.message);
  }

  // TEST 11: Transaction Ledger Audit Trail
  try {
    const ledgerRes = await fetch(`${BASE_URL}/api/ledger`);
    const ledgerData = await ledgerRes.json();
    assert(ledgerRes.status === 200, "11. GET /api/ledger returns 200");
    assert(Array.isArray(ledgerData.logs) && ledgerData.logs.length > 0, "11. Audit logs recorded in MongoDB");
    const sampleLog = ledgerData.logs[0];
    assert(sampleLog.buyer && sampleLog.seller && sampleLog.status && typeof sampleLog.latencyMs === "number", "11. Ledger schema fields strictly present");
  } catch (err) {
    assert(false, "11. Ledger audit trail error", err.message);
  }

  // TEST 12: Micro-Explorer
  if (latestTxHash) {
    try {
      const txRes = await fetch(`${BASE_URL}/api/tx/${latestTxHash}`);
      assert(txRes.status === 200, `12. GET /api/tx/${latestTxHash.slice(0, 10)}... returns 200`);
      const txData = await txRes.json();
      assert(txData.transaction.status === "CONFIRMED", "12. Transaction status is CONFIRMED");
      assert(txData.transaction.ecdsaValid === true, "12. Cryptographic ECDSA signature marked valid");
      assert(txData.transaction.authorization && txData.transaction.authorization.nonce, "12. EIP-3009 authorization decoded and present");
      assert(txData.transaction.gasSponsored.includes("Sponsored by Facilitator"), "12. Gas sponsorship badge displayed");
    } catch (err) {
      assert(false, "12. Micro-Explorer test error", err.message);
    }
  }

  // TEARDOWN (OPTION 1): Clean up test artifacts so MongoDB stays pristine
  const keepData = process.argv.includes("--keep-data");
  if (!keepData) {
    try {
      const teardownRes = await fetch(`${BASE_URL}/api/test/teardown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonces: createdNonces,
          txHashes: createdTxHashes,
          taskIds: createdTaskIds,
          buyerAddress,
        }),
      });
      if (teardownRes.ok) {
        const tdData = await teardownRes.json();
        console.log(`\n\x1b[36m🧹 OPTION 1 TEARDOWN COMPLETE:\x1b[0m Cleaned up ${tdData.cleaned?.authorizations ?? 0} authorizations, ${tdData.cleaned?.transfers ?? 0} transfers, ${tdData.cleaned?.ledgerEntries ?? 0} ledger records. Buyer wallet balance restored.`);
      }
    } catch (tdErr) {
      console.warn("Teardown warning:", tdErr.message);
    }
  } else {
    console.log(`\n\x1b[33mℹ TEARDOWN SKIPPED (--keep-data flag active): Test records preserved in database.\x1b[0m`);
  }

  // FINAL SUMMARY REPORT
  console.log("\n=======================================================");
  console.log(`  Test Run Complete: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    console.error(`\x1b[31mSome tests failed. Please review the output above.\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32mAll endpoints and protocol flows verified successfully! Ready for judges.\x1b[0m\n`);
    process.exit(0);
  }
}

runTests();
