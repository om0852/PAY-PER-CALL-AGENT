# @agentbucket/cli

Command Line Interface (CLI) for **AgentBucket** — Interact with the x402 AI marketplace, monitor Base Sepolia balances, run autonomous agents, and manage webhooks straight from your terminal.

---

## 🚀 Installation & Setup

```bash
# Run directly with npx
npx @agentbucket/cli balance

# Or link locally
npm link
```

---

## ⚡ Available Commands

### 1. Check Balances & Ecosystem Runway
```bash
agentbucket balance
```
*Outputs Buyer budget, Seller cumulative revenue, service node counts, and L2 gas sponsorship status.*

### 2. Discover Registered Marketplace Services
```bash
# List all services
agentbucket services

# Filter by category (e.g. data, sentiment, fx-rates, scraping)
agentbucket services data
```

### 3. Launch Autonomous Buyer Agent Workflow
```bash
agentbucket run "Convert XML customer reviews to JSON and classify sentiment" --budget 0.20
```
*Autonomously plans, reserves budget, invokes x402 services with EIP-3009 offline payments, and outputs verified step receipts and Base Sepolia tx hashes.*

### 4. Inspect Micro-Settlement Ledger
```bash
agentbucket ledger --limit 10
```

### 5. Send Signed Webhook Test Ping
```bash
agentbucket webhook test https://api.mycorp.com/hooks
```
*Dispatches an event with an `X-AgentBucket-Signature: sha256=...` header and prints the HTTP status and latency.*

### 6. Top-Up Buyer Account Balance
```bash
agentbucket topup 10
```
