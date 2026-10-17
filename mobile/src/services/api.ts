/**
 * AgentBucket Mobile API Client
 * Interacts with Next.js x402 Backend & Base Sepolia Relayer
 */

// Public production backend or local IP address for Expo Go physical device testing
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.44.236.219:3000";

export interface MobileDashboardData {
  network: string;
  chainId: number;
  buyer: {
    address: string;
    balanceUsdc: string;
    rawBalance: number;
    isLowBalance: boolean;
  };
  seller: {
    address: string;
    balanceUsdc: string;
  };
  servicesSummary: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
  };
  alerts: Array<{
    id: string;
    type: "LOW_BALANCE" | "FAILED_TASK" | "SERVICE_DOWN";
    title: string;
    message: string;
    severity: "warning" | "error" | "info";
    timestamp: number;
  }>;
  unreadAlertsCount: number;
  recentTransactions: Array<{
    id: string;
    taskId: string;
    serviceName: string;
    category: string;
    amountUsdc: string;
    status: string;
    latencyMs: number;
    txHash: string | null;
    time: string;
  }>;
  totalSettledCount: number;
  totalInvocationsCount: number;
}

export const fetchDashboardData = async (): Promise<MobileDashboardData> => {
  const res = await fetch(`${API_BASE_URL}/api/mobile/dashboard`);
  if (!res.ok) throw new Error("Failed to fetch mobile dashboard data");
  const json = await res.json();
  return json.data;
};

export const topupBalance = async (amountUsdc: number): Promise<{ success: boolean; newBalanceUsdc: string; message: string }> => {
  const res = await fetch(`${API_BASE_URL}/api/mobile/balance/topup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountUsdc }),
  });
  if (!res.ok) throw new Error("Failed to deposit funds");
  return await res.json();
};

export const fetchAlerts = async () => {
  const res = await fetch(`${API_BASE_URL}/api/mobile/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return await res.json();
};

export const fetchServices = async () => {
  const res = await fetch(`${API_BASE_URL}/api/registry/services`);
  if (!res.ok) throw new Error("Failed to fetch services");
  const json = await res.json();
  return json.services || [];
};

export const fetchRentals = async (buyerAddress: string = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266") => {
  const res = await fetch(`${API_BASE_URL}/api/rentals?buyer=${buyerAddress}`);
  if (!res.ok) throw new Error("Failed to fetch active rentals");
  const json = await res.json();
  return json.rentals || [];
};

export const runAutomationTask = async (
  task: string,
  budgetUsdc: number = 0.5,
  buyerAddress: string = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
) => {
  const res = await fetch(`${API_BASE_URL}/api/buyer/run`, {
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
  if (!res.ok) throw new Error("Failed to start agent automation");
  return await res.json();
};

export const runMobileHealthCheck = async () => {
  const res = await fetch(`${API_BASE_URL}/api/mobile/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "RUN_HEALTH_CHECK" }),
  });
  if (!res.ok) throw new Error("Health check failed");
  return await res.json();
};

export const markAllAlertsRead = async () => {
  const res = await fetch(`${API_BASE_URL}/api/mobile/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "MARK_ALL_READ" }),
  });
  if (!res.ok) throw new Error("Failed to mark alerts as read");
  return await res.json();
};
