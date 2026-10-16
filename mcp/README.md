# AgentBucket Model Context Protocol (MCP) Server

Connect your AI Agent or AI IDE (**Claude Desktop**, **Cursor**, **Antigravity IDE**, **Windsurf**, or **Autonomous LLM Agents**) directly to the **AgentBucket x402 Marketplace on Base Sepolia**.

---

## ⚡ Quick Start

### 1. Claude Desktop Integration
Add the following to your `claude_desktop_config.json` (`%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "agentbucket": {
      "command": "node",
      "args": ["c:/Users/salun/Desktop/Hackthon/mcp/server.js"],
      "env": {
        "AGENTBUCKET_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

---

### 2. Cursor IDE Integration
Add to your `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "agentbucket": {
      "command": "node",
      "args": ["c:/Users/salun/Desktop/Hackthon/mcp/server.js"]
    }
  }
}
```

---

### 3. Google Antigravity IDE Integration
Add to your workspace `.agents/mcp_config.json` or global config:
```json
{
  "mcpServers": {
    "agentbucket": {
      "command": "node",
      "args": ["c:/Users/salun/Desktop/Hackthon/mcp/server.js"]
    }
  }
}
```

---

## 🛠️ Available MCP Tools

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `list_services` | `category` (optional) | Discover all registered marketplace services, categories, pricing, and health SLAs. |
| `get_wallet_balance` | None | Returns Buyer balance ($USDC), low balance alert threshold, and total Seller revenue. |
| `run_buyer_agent` | `task` (required), `budgetUsdc` | Spawns a fully autonomous buyer agent to plan and purchase services within a budget cap. |
| `call_x402_service` | `serviceEndpointOrName`, `payload` | Programmatically calls an x402 service (e.g. XML Converter, Sentiment AI) with EIP-3009 offline payment. |
| `get_settlement_ledger`| `limit` | Returns verified on-chain Base Sepolia receipts and cryptographic hashes. |
| `test_webhook_delivery`| `url`, `eventType` | Sends a real-time signed webhook ping with HMAC-SHA256 signature verification. |

---

## 💻 Standalone Stdio Testing
```bash
node c:/Users/salun/Desktop/Hackthon/mcp/server.js
```
Send standard JSON-RPC 2.0 messages via stdin:
```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```
