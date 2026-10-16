export interface ClientOptions {
  baseUrl?: string;
  apiKey?: string;
  buyerPrivateKey?: string;
}

export interface ServiceSummary {
  _id?: string;
  name: string;
  category: string;
  endpoint: string;
  price: number;
  active: boolean;
  health?: {
    status: string;
    latencyMs: number;
  };
}

export interface WalletRecord {
  _id: string;
  address: string;
  balance: number;
  role: "buyer" | "seller" | "facilitator";
  label: string;
}

export interface AgentRunParams {
  task: string;
  budgetUsdc?: number;
  maxConcurrency?: number;
}

export interface AgentRunResult {
  taskId: string;
  task: string;
  status: "COMPLETED" | "FAILED";
  totalSpentAtomic: number;
  totalSpentUsdc: string;
  steps: Array<{
    step: number;
    category: string;
    serviceName: string;
    priceUsdc: string;
    txHash?: string;
    status: string;
    latencyMs?: number;
  }>;
  summary: string;
}

export interface WebhookRegistration {
  url: string;
  events?: string[];
  description?: string;
}

export class AgentBucketClient {
  constructor(options?: ClientOptions);

  services: {
    list(filters?: { category?: string }): Promise<ServiceSummary[]>;
    getHealth(): Promise<any>;
  };

  wallets: {
    getBalances(): Promise<WalletRecord[]>;
    topup(amountUsdc: number): Promise<{ success: boolean; newBalanceUsdc: string; txHash: string }>;
  };

  agent: {
    run(params: AgentRunParams): Promise<AgentRunResult>;
  };

  ledger: {
    getSettlements(limit?: number): Promise<any[]>;
    getTransaction(hash: string): Promise<any>;
  };

  webhooks: {
    list(): Promise<any[]>;
    register(params: WebhookRegistration): Promise<any>;
    testPing(url: string, eventType?: string): Promise<any>;
    verifySignature(rawBody: string, signatureHeader: string, secret: string): boolean;
  };

  callService(endpointOrName: string, payload: any): Promise<{
    status: number;
    headers: { paymentRequired?: string | null };
    data: any;
  }>;
}
