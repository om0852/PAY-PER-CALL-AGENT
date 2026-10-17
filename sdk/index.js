const crypto = require("crypto");

class AgentBucketClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || "http://localhost:3000").replace(/\/$/, "");
    this.apiKey = options.apiKey || null;
    this.buyerPrivateKey = options.buyerPrivateKey || null;

    this.services = {
      list: async (filters = {}) => {
        const url = new URL(`${this.baseUrl}/api/registry/services`);
        if (filters.category) url.searchParams.set("category", filters.category);
        const res = await this._fetch(url.toString());
        return res.services || [];
      },
      getHealth: async () => {
        const res = await this._fetch(`${this.baseUrl}/api/registry/health-check`);
        return res;
      },
    };

    this.wallets = {
      getBalances: async () => {
        const res = await this._fetch(`${this.baseUrl}/api/wallets`);
        return res.wallets || [];
      },
      topup: async (amountUsdc) => {
        return await this._fetch(`${this.baseUrl}/api/mobile/balance/topup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountUsdc }),
        });
      },
    };

    this.agent = {
      run: async (params) => {
        const {
          task,
          budgetUsdc = 0.5,
          maxConcurrency = 3,
          buyerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        } = params;
        return await this._fetch(`${this.baseUrl}/api/buyer/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-buyer-address": buyerAddress,
            "x-buyer": buyerAddress,
          },
          body: JSON.stringify({
            task,
            budget: Math.round(budgetUsdc * 1_000_000),
            maxConcurrency,
            buyerAddress,
          }),
        });
      },
    };

    this.rentals = {
      list: async (buyerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266") => {
        const res = await this._fetch(`${this.baseUrl}/api/rentals?buyer=${buyerAddress}`);
        return res.rentals || [];
      },
      rent: async (params) => {
        return await this._fetch(`${this.baseUrl}/api/rentals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
      },
    };

    this.ledger = {
      getSettlements: async (limit = 20) => {
        const res = await this._fetch(`${this.baseUrl}/api/ledger`);
        const list = res.ledger || res.logs || [];
        return list.slice(0, limit);
      },
      getTransaction: async (hash) => {
        return await this._fetch(`${this.baseUrl}/api/tx/${hash}`);
      },
    };

    this.webhooks = {
      list: async () => {
        const res = await this._fetch(`${this.baseUrl}/api/developer/webhooks`);
        return res.webhooks || [];
      },
      register: async (params) => {
        return await this._fetch(`${this.baseUrl}/api/developer/webhooks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
      },
      testPing: async (url, eventType = "settlement.completed") => {
        return await this._fetch(`${this.baseUrl}/api/developer/webhooks/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, eventType }),
        });
      },
      verifySignature: (rawBody, signatureHeader, secret) => {
        if (!signatureHeader || !secret) return false;
        const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
      },
    };
  }

  async callService(endpointOrName, payload, options = {}) {
    let endpoint = endpointOrName;
    if (!endpoint.startsWith("http")) {
      endpoint = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    }

    const buyerAddress = options.buyerAddress || options.buyer || "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
    const headers = {
      "Content-Type": "application/json",
      "x-buyer-address": buyerAddress,
      "x-buyer": buyerAddress,
      ...(options.headers || {}),
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const bodyText = await res.text();
    let bodyJson;
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      bodyJson = bodyText;
    }

    return {
      status: res.status,
      headers: {
        paymentRequired: res.headers.get("payment-required") || res.headers.get("x-payment-required"),
        paymentMode: res.headers.get("x-payment-mode"),
        rentalQuotaUsed: res.headers.get("x-rental-quota-used"),
        rentalRemaining: res.headers.get("x-rental-remaining"),
      },
      data: bodyJson,
    };
  }

  async _fetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error) errText += `: ${errJson.error}`;
      } catch {}
      throw new Error(errText);
    }
    return await res.json();
  }
}

module.exports = { AgentBucketClient };
