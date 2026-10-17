#!/usr/bin/env node

/**
 * AgentBucket Model Context Protocol (MCP) Server
 * Compatible with Claude Desktop, Cursor, Antigravity IDE, Windsurf, Copilot
 * Protocol: JSON-RPC 2.0 over stdio
 */

const readline = require("readline");

const API_BASE_URL = process.env.AGENTBUCKET_API_URL || "http://localhost:3000";

// Standard MCP Tool Definitions
const TOOLS = [
  {
    name: "list_services",
    description: "List all active AI micro-services on the x402 marketplace with their categories, pricing in USDC, endpoint URLs, and real-time SLA health.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional category filter: scraping, fx-rates, summarization, sentiment, crypto-oracle, compliance, reporting, data",
        },
      },
    },
  },
  {
    name: "get_wallet_balance",
    description: "Get current testnet USDC balances for the autonomous Buyer Agent and total earned revenue across Seller nodes on Base Sepolia.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "run_buyer_agent",
    description: "Launch an autonomous AI buyer agent that plans, purchases x402 services, and fulfills multi-step research or data workflows with strict budget caps.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "High-level goal or prompt for the autonomous agent to solve.",
        },
        xml: {
          type: "string",
          description: "Optional custom XML content to convert or process.",
        },
        budgetUsdc: {
          type: "number",
          description: "Max budget limit in USDC (e.g. 0.25). Defaults to 0.50 USDC.",
        },
      },
      required: ["task"],
    },
  },
  {
    name: "call_x402_service",
    description: "Directly invoke an x402 marketplace service (such as XML to JSON or Sentiment Classifier) with automatic EIP-3009 offline payment authorization.",
    inputSchema: {
      type: "object",
      properties: {
        serviceEndpointOrName: {
          type: "string",
          description: "Service endpoint path (e.g. '/api/sellers/xml-to-json' or '/api/sellers/sentiment-categorizer') or category name.",
        },
        payload: {
          type: "object",
          description: "The JSON payload to send to the service.",
        },
        buyerAddress: {
          type: "string",
          description: "Buyer wallet address (default: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266).",
        },
      },
      required: ["serviceEndpointOrName", "payload"],
    },
  },
  {
    name: "list_rentals",
    description: "Query active prepaid rental leases, remaining quota, total calls, and lease expiration dates for the buyer.",
    inputSchema: {
      type: "object",
      properties: {
        buyerAddress: {
          type: "string",
          description: "Buyer wallet address (default: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266).",
        },
      },
    },
  },
  {
    name: "get_settlement_ledger",
    description: "Fetch recent cryptographic micro-settlements, transaction hashes, latencies, and gas sponsorship receipts from the Base Sepolia ledger.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of recent settlements to retrieve (default: 10).",
        },
      },
    },
  },
  {
    name: "test_webhook_delivery",
    description: "Simulate and test a webhook delivery event with HMAC-SHA256 signature verification.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Target HTTP/HTTPS webhook URL.",
        },
        eventType: {
          type: "string",
          description: "Event type: settlement.completed, balance.low, task.failed",
        },
      },
      required: ["url"],
    },
  },
];

// Tool Handlers
async function handleToolCall(name, args) {
  switch (name) {
    case "list_services": {
      const res = await fetch(`${API_BASE_URL}/api/registry/services`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch services`);
      const data = await res.json();
      let services = data.services || [];
      if (args.category) {
        services = services.filter((s) => s.category?.toLowerCase() === args.category.toLowerCase());
      }
      return {
        total: services.length,
        services: services.map((s) => ({
          name: s.name,
          category: s.category,
          priceUsdc: ((s.price || 0) / 1e6).toFixed(4),
          endpoint: s.endpoint,
          health: s.health?.status || "HEALTHY",
          latencyMs: s.health?.latencyMs || 45,
        })),
      };
    }

    case "get_wallet_balance": {
      const res = await fetch(`${API_BASE_URL}/api/mobile/dashboard`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch balances`);
      const json = await res.json();
      return {
        network: json.data?.network || "Base Sepolia (L2)",
        chainId: json.data?.chainId || 84532,
        buyerWallet: {
          address: json.data?.buyer?.address,
          balanceUsdc: json.data?.buyer?.balanceUsdc,
          isLowBalance: json.data?.buyer?.isLowBalance,
        },
        sellerRevenue: {
          totalEarnedUsdc: json.data?.seller?.balanceUsdc,
          settledTransactions: json.data?.totalSettledCount,
        },
      };
    }

    case "run_buyer_agent": {
      const buyerAddress = args.buyerAddress || args.buyer || "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
      const res = await fetch(`${API_BASE_URL}/api/buyer/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-buyer-address": buyerAddress,
          "x-buyer": buyerAddress,
        },
        body: JSON.stringify({
          task: args.task,
          xml: args.xml,
          budget: Math.round((args.budgetUsdc || 0.5) * 1_000_000),
          maxConcurrency: 3,
          buyerAddress,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Agent execution failed`);
      return await res.json();
    }

    case "call_x402_service": {
      let endpoint = args.serviceEndpointOrName;
      if (!endpoint.startsWith("http")) {
        endpoint = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
      }
      const buyerAddress = args.buyerAddress || args.buyer || "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
      const headers = {
        "Content-Type": "application/json",
        "x-buyer-address": buyerAddress,
        "x-buyer": buyerAddress,
      };
      if (args.paymentSignature) {
        headers["payment-signature"] = args.paymentSignature;
        headers["x-payment"] = args.paymentSignature;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(args.payload),
      });

      const bodyText = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = bodyText;
      }

      return {
        statusCode: res.status,
        headers: {
          paymentRequired: res.headers.get("payment-required"),
          paymentMode: res.headers.get("x-payment-mode"),
          rentalQuotaUsed: res.headers.get("x-rental-quota-used"),
          rentalRemaining: res.headers.get("x-rental-remaining"),
        },
        response: parsed,
      };
    }

    case "list_rentals": {
      const buyer = args.buyerAddress || args.buyer || "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
      const res = await fetch(`${API_BASE_URL}/api/rentals?buyer=${buyer}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch rentals`);
      const json = await res.json();
      return {
        count: (json.rentals || []).length,
        rentals: json.rentals || [],
      };
    }

    case "get_settlement_ledger": {
      const limit = args.limit || 10;
      const res = await fetch(`${API_BASE_URL}/api/ledger`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch ledger`);
      const json = await res.json();
      const entries = (json.ledger || json.logs || []).slice(0, limit);
      return {
        count: entries.length,
        settlements: entries.map((e) => ({
          taskId: e.taskId,
          serviceName: e.serviceName,
          category: e.category,
          amountUsdc: ((e.paidPrice || 0) / 1e6).toFixed(4),
          status: e.status,
          latencyMs: e.latencyMs,
          txHash: e.txHash,
          time: e.createdAt,
        })),
      };
    }

    case "test_webhook_delivery": {
      const res = await fetch(`${API_BASE_URL}/api/developer/webhooks/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: args.url,
          eventType: args.eventType || "settlement.completed",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Webhook test failed`);
      return await res.json();
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// JSON-RPC stdio Transport
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function sendResponse(id, result, error = null) {
  const response = { jsonrpc: "2.0", id };
  if (error) {
    response.error = { code: -32000, message: error.message || String(error) };
  } else {
    response.result = result;
  }
  process.stdout.write(JSON.stringify(response) + "\n");
}

rl.on("line", async (line) => {
  if (!line.trim()) return;

  let message;
  try {
    message = JSON.parse(line);
  } catch (err) {
    sendResponse(null, null, new Error("Invalid JSON"));
    return;
  }

  const { id, method, params } = message;

  try {
    switch (method) {
      case "initialize":
        sendResponse(id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "agentbucket-mcp-server",
            version: "1.0.0",
          },
        });
        break;

      case "notifications/initialized":
        // No-op for initialized notification
        break;

      case "ping":
        sendResponse(id, {});
        break;

      case "tools/list":
        sendResponse(id, { tools: TOOLS });
        break;

      case "tools/call": {
        const { name, arguments: toolArgs } = params || {};
        try {
          const result = await handleToolCall(name, toolArgs || {});
          sendResponse(id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          });
        } catch (toolErr) {
          sendResponse(id, {
            content: [
              {
                type: "text",
                text: `Error executing ${name}: ${toolErr.message}`,
              },
            ],
            isError: true,
          });
        }
        break;
      }

      default:
        sendResponse(id, null, new Error(`Method not found: ${method}`));
        break;
    }
  } catch (err) {
    sendResponse(id, null, err);
  }
});

process.stderr.write("AgentBucket MCP Server running on stdio...\n");
