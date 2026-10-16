import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Wallet from "@/lib/models/Wallet";
import Service from "@/lib/models/Service";
import Ledger from "@/lib/models/Ledger";
import { ensureSeededData } from "@/lib/x402/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    await ensureSeededData();

    // 1. Wallets
    const wallets = await Wallet.find({}).lean();
    const buyerWallet = wallets.find((w) => w.role === "buyer") || {
      address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      balance: 10000000,
    };
    const sellerWallet = wallets.find((w) => w.role === "seller") || {
      address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      balance: 0,
    };

    const buyerBalanceUsdc = (buyerWallet.balance / 1e6).toFixed(4);
    const buyerRawBalance = buyerWallet.balance / 1e6;

    // 2. Services
    const services = await Service.find({}).lean();
    const healthyCount = services.filter((s) => s.health?.status === "HEALTHY" && s.active !== false).length;
    const degradedCount = services.filter((s) => s.health?.status === "DEGRADED" || s.health?.status === "SCHEMA_MISMATCH").length;
    const downCount = services.filter((s) => s.health?.status === "DOWN" || s.active === false).length;

    // 3. Ledger & Transactions (matches web platform total revenue exactly)
    const [allSettledEntries, ledger] = await Promise.all([
      Ledger.find({ status: "SETTLED" }).select("paidPrice").lean(),
      Ledger.find({}).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const totalRevenueAtomic = allSettledEntries.reduce((sum, e) => sum + (e.paidPrice || 0), 0);
    const sellerBalanceUsdc = (totalRevenueAtomic / 1e6).toFixed(4);
    const settledTransactions = ledger.filter((l) => l.status === "SETTLED");
    const failedTransactions = ledger.filter((l) => l.status && l.status.includes("FAILED"));

    // 4. Generate dynamic mobile alerts
    const alerts: Array<{
      id: string;
      type: "LOW_BALANCE" | "FAILED_TASK" | "SERVICE_DOWN";
      title: string;
      message: string;
      severity: "warning" | "error" | "info";
      timestamp: number;
    }> = [];

    // Alert 1: Low balance check (< 2.00 USDC)
    if (buyerRawBalance < 2.0) {
      alerts.push({
        id: "alert-low-balance",
        type: "LOW_BALANCE",
        title: "⚠️ Low Buyer Balance Alert",
        message: `Your Buyer Agent balance is $${buyerBalanceUsdc} USDC. Top up to prevent scheduled task execution halts.`,
        severity: buyerRawBalance < 0.5 ? "error" : "warning",
        timestamp: Date.now(),
      });
    }

    // Alert 2: Failed tasks / schema rejections
    if (failedTransactions.length > 0) {
      const latestFail = failedTransactions[0];
      alerts.push({
        id: `alert-fail-${latestFail._id}`,
        type: "FAILED_TASK",
        title: "❌ Execution Schema Dispute Auto-Refunded",
        message: `Task step on "${latestFail.serviceName}" failed output schema. $0.00 charged. Buyer refunded.`,
        severity: "warning",
        timestamp: new Date(latestFail.createdAt || Date.now()).getTime(),
      });
    }

    // Alert 3: Service down / degraded
    if (downCount > 0 || degradedCount > 0) {
      const badService = services.find((s) => s.health?.status === "DOWN" || s.health?.status === "DEGRADED" || s.active === false);
      alerts.push({
        id: `alert-down-${badService?._id || "srv"}`,
        type: "SERVICE_DOWN",
        title: "🔴 Service Node Alert",
        message: `Node "${badService?.name || "Service"}" is currently ${badService?.health?.status || "Offline"}. Fallback nodes active.`,
        severity: "error",
        timestamp: Date.now() - 60000,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        network: "Base Sepolia (L2)",
        chainId: 84532,
        buyer: {
          address: buyerWallet.address,
          balanceUsdc: buyerBalanceUsdc,
          rawBalance: buyerRawBalance,
          isLowBalance: buyerRawBalance < 2.0,
        },
        seller: {
          address: sellerWallet.address,
          balanceUsdc: sellerBalanceUsdc,
        },
        servicesSummary: {
          total: services.length,
          healthy: healthyCount,
          degraded: degradedCount,
          down: downCount,
        },
        alerts,
        unreadAlertsCount: alerts.length,
        recentTransactions: ledger.slice(0, 8).map((tx) => ({
          id: tx._id,
          taskId: tx.taskId,
          serviceName: tx.serviceName,
          category: tx.category,
          amountUsdc: ((tx.paidPrice || tx.askedPrice || 50000) / 1e6).toFixed(4),
          status: tx.status,
          latencyMs: tx.latencyMs || 42,
          txHash: tx.txHash,
          time: new Date(tx.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })),
        totalSettledCount: settledTransactions.length,
        totalInvocationsCount: ledger.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
