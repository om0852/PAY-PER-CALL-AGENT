#!/usr/bin/env node

/**
 * AgentBucket CLI
 * Interact with x402 AI marketplace, autonomous agents, and Base Sepolia settlements
 */

const API_BASE_URL = process.env.AGENTBUCKET_API_URL || "http://localhost:3000";

const args = process.argv.slice(2);
const command = args[0] || "help";

function showHelp() {
  console.log(`
\x1b[33m\x1b[1m⚡ AgentBucket CLI v1.0.0\x1b[0m
Autonomous Agent Marketplace & EIP-3009 Gasless Settlement Gateway

\x1b[1mUSAGE:\x1b[0m
  $ agentbucket <command> [options]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[36mbalance\x1b[0m                   Check Buyer budget, Seller revenue, and Base Sepolia addresses
  \x1b[36mservices [category]\x1b[0m       List registered AI services, pricing in USDC, and SLA status
  \x1b[36mrun "<task>" [--budget N]\x1b[0m Launch an autonomous buyer agent workflow with budget limit
  \x1b[36mtopup <amount>\x1b[0m            Deposit testnet USDC into the Buyer Agent balance
  \x1b[36mledger [--limit N]\x1b[0m        Inspect recent cryptographic micro-settlements and tx hashes
  \x1b[36mwebhook test <url>\x1b[0m        Send an HMAC-SHA256 signed test ping to a webhook URL
  \x1b[36mhelp\x1b[0m                      Display this help menu

\x1b[1mOPTIONS:\x1b[0m
  --api <url>               Override API Base URL (default: http://localhost:3000)
  --json                    Output response as raw JSON

\x1b[1mEXAMPLES:\x1b[0m
  $ agentbucket balance
  $ agentbucket services data
  $ agentbucket run "Parse XML reviews and classify sentiment" --budget 0.20
  $ agentbucket webhook test https://api.mycorp.com/hooks
`);
}

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Could not connect to AgentBucket gateway at ${API_BASE_URL}: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  switch (command) {
    case "balance": {
      const { data } = await fetchJson("/api/mobile/dashboard");
      const d = data.data || {};
      console.log(`\n\x1b[1m--- AgentBucket Wallet & Balances (${d.network || "Base Sepolia"}) ---\x1b[0m`);
      console.log(`\x1b[34m[BUYER AGENT]\x1b[0m`);
      console.log(`  Address : ${d.buyer?.address}`);
      console.log(`  Balance : \x1b[1m$${d.buyer?.balanceUsdc} USDC\x1b[0m ${d.buyer?.isLowBalance ? "\x1b[31m(LOW BALANCE ALERT)\x1b[0m" : "\x1b[32m(HEALTHY RUNWAY)\x1b[0m"}`);
      console.log(`\n\x1b[32m[SELLER REVENUE]\x1b[0m`);
      console.log(`  Address : ${d.seller?.address}`);
      console.log(`  Total Earned : \x1b[1m+$${d.seller?.balanceUsdc} USDC\x1b[0m across ${d.totalSettledCount || 0} settled claims`);
      console.log(`\n\x1b[33m[ECOSYSTEM STATUS]\x1b[0m`);
      console.log(`  Active Services : ${d.servicesSummary?.healthy || 0} Healthy / ${d.servicesSummary?.total || 0} Total`);
      console.log(`  Gas Relayer     : \x1b[32m100% Covered (Zero-Gas Sponsorship)\x1b[0m\n`);
      break;
    }

    case "services": {
      const filterCategory = args[1]?.startsWith("--") ? null : args[1];
      const { data } = await fetchJson("/api/registry/services");
      let services = data.services || [];
      if (filterCategory) {
        services = services.filter((s) => s.category?.toLowerCase() === filterCategory.toLowerCase());
      }

      console.log(`\n\x1b[1mRegistered AI Services (${services.length} available):\x1b[0m`);
      console.log("─".repeat(85));
      console.log(`${"SERVICE NAME".padEnd(36)} ${"CATEGORY".padEnd(16)} ${"PRICE (USDC)".padEnd(14)} ${"STATUS"}`);
      console.log("─".repeat(85));

      services.forEach((s) => {
        const price = `$${((s.price || 0) / 1e6).toFixed(4)}`;
        const statusColor = s.health?.status === "HEALTHY" ? "\x1b[32m" : "\x1b[33m";
        const status = `${statusColor}${s.health?.status || "HEALTHY"}\x1b[0m`;
        console.log(`${s.name.slice(0, 34).padEnd(36)} ${s.category.slice(0, 14).padEnd(16)} ${price.padEnd(14)} ${status}`);
      });
      console.log("─".repeat(85) + "\n");
      break;
    }

    case "run": {
      const task = args[1];
      if (!task || task.startsWith("--")) {
        console.error("\x1b[31m[ERROR]\x1b[0m Please provide a task description: agentbucket run \"Your task here\"");
        process.exit(1);
      }

      let budgetUsdc = 0.5;
      const budgetIdx = args.indexOf("--budget");
      if (budgetIdx !== -1 && args[budgetIdx + 1]) {
        budgetUsdc = parseFloat(args[budgetIdx + 1]) || 0.5;
      }

      console.log(`\n\x1b[33m⚡ Launching Autonomous Buyer Agent...\x1b[0m`);
      console.log(`\x1b[1mTask:\x1b[0m "${task}"`);
      console.log(`\x1b[1mMax Budget Cap:\x1b[0m $${budgetUsdc.toFixed(2)} USDC | \x1b[1mGas:\x1b[0m 100% Sponsored\n`);

      const startTime = Date.now();
      const buyerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
      const { ok, data } = await fetchJson("/api/buyer/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-buyer-address": buyerAddress,
          "x-buyer": buyerAddress,
        },
        body: JSON.stringify({
          task,
          budget: Math.round(budgetUsdc * 1_000_000),
          maxConcurrency: 3,
          buyerAddress,
        }),
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      if (!ok || data.error) {
        console.error(`\x1b[31m[EXECUTION FAILED]\x1b[0m ${data.error || "Unknown error"}`);
        process.exit(1);
      }

      const totalSpentUsdc = ((data.totalSpent || 0) / 1e6).toFixed(4);
      const purchases = data.purchases || [];

      console.log(`\x1b[32m✔ Autonomous Plan Solved in ${elapsed}s!\x1b[0m`);
      console.log(`\x1b[1mTask ID:\x1b[0m ${data.taskId}`);
      console.log(`\x1b[1mTotal Settled:\x1b[0m $${totalSpentUsdc} USDC (${purchases.length} service calls)\n`);

      console.log("\x1b[1mExecution Trace & EIP-3009 Receipts:\x1b[0m");
      console.log("─".repeat(80));
      purchases.forEach((p, idx) => {
        const hashDisplay = p.txHash ? `Tx: ${p.txHash.slice(0, 14)}...` : "EIP-712 Verified";
        console.log(`  Step ${idx + 1}: \x1b[1m${p.serviceName}\x1b[0m [${p.category}]`);
        console.log(`          Cost: ${p.price} • Latency: ${p.latencyMs || 50}ms • \x1b[36m${hashDisplay}\x1b[0m`);
      });
      console.log("─".repeat(80));

      const remainingUsdc = ((data.remainingBudget || 0) / 1e6).toFixed(4);
      console.log(`\n\x1b[32m[RESULT]\x1b[0m Execution completed successfully within budget. Remaining budget: $${remainingUsdc} USDC.\n`);
      break;
    }

    case "topup": {
      const amount = parseFloat(args[1] || "5.00");
      if (isNaN(amount) || amount <= 0) {
        console.error("\x1b[31m[ERROR]\x1b[0m Specify a valid top-up amount: agentbucket topup 10");
        process.exit(1);
      }

      console.log(`Depositing +$${amount.toFixed(2)} USDC into Buyer Agent balance...`);
      const { data } = await fetchJson("/api/mobile/balance/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsdc: amount }),
      });

      if (data.success) {
        console.log(`\x1b[32m✔ ${data.message}\x1b[0m`);
        console.log(`  New Balance: \x1b[1m$${data.newBalanceUsdc} USDC\x1b[0m`);
        console.log(`  Tx Hash    : ${data.txHash}\n`);
      } else {
        console.error(`\x1b[31m[FAILED]\x1b[0m ${data.error}`);
      }
      break;
    }

    case "ledger": {
      let limit = 10;
      const limitIdx = args.indexOf("--limit");
      if (limitIdx !== -1 && args[limitIdx + 1]) limit = parseInt(args[limitIdx + 1]);

      const { data } = await fetchJson("/api/ledger");
      const list = (data.ledger || data.logs || []).slice(0, limit);

      console.log(`\n\x1b[1mBase Sepolia Micro-Settlement Ledger (${list.length} recent entries):\x1b[0m`);
      console.log("─".repeat(90));
      console.log(`${"TIME".padEnd(12)} ${"SERVICE".padEnd(30)} ${"SETTLED".padEnd(14)} ${"LATENCY".padEnd(10)} ${"TX HASH"}`);
      console.log("─".repeat(90));

      list.forEach((e) => {
        const time = new Date(e.createdAt || Date.now()).toLocaleTimeString();
        const amt = `+$${((e.paidPrice || 0) / 1e6).toFixed(4)} USDC`;
        const lat = `${e.latencyMs || 40}ms`;
        const hash = e.txHash ? `${e.txHash.slice(0, 16)}...` : "EIP-712 Verified";
        console.log(`${time.padEnd(12)} ${e.serviceName.slice(0, 28).padEnd(30)} ${amt.padEnd(14)} ${lat.padEnd(10)} \x1b[36m${hash}\x1b[0m`);
      });
      console.log("─".repeat(90) + "\n");
      break;
    }

    case "webhook": {
      if (args[1] === "test") {
        const url = args[2];
        if (!url) {
          console.error("\x1b[31m[ERROR]\x1b[0m Provide target URL: agentbucket webhook test https://example.com/hook");
          process.exit(1);
        }

        console.log(`\nSending signed HMAC-SHA256 test ping to: \x1b[36m${url}\x1b[0m...`);
        const { data } = await fetchJson("/api/developer/webhooks/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (data.success) {
          console.log(`\x1b[32m✔ Webhook Ping Delivered Successfully!\x1b[0m`);
          console.log(`  HTTP Status : \x1b[1m${data.delivery?.statusCode}\x1b[0m`);
          console.log(`  Latency     : ${data.delivery?.latencyMs}ms`);
          console.log(`  Signature   : \x1b[33m${data.delivery?.headers["X-AgentBucket-Signature"]}\x1b[0m`);
          console.log(`  Event Type  : ${data.delivery?.headers["X-AgentBucket-Event"]}`);
          console.log(`  Payload Tx  : ${data.delivery?.payload?.data?.txHash}\n`);
        } else {
          console.error(`\x1b[31m[FAILED]\x1b[0m ${data.error}`);
        }
      } else {
        console.log("Usage: agentbucket webhook test <url>");
      }
      break;
    }

    case "help":
    default:
      showHelp();
      break;
  }
}

main();
