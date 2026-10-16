import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Wallet from "@/lib/models/Wallet";
import Service from "@/lib/models/Service";
import Ledger from "@/lib/models/Ledger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const [buyerWallet, services, failedEntries] = await Promise.all([
      Wallet.findOne({ role: "buyer" }).lean(),
      Service.find({}).lean(),
      Ledger.find({ status: { $regex: /FAILED/ } }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const buyerBalance = (buyerWallet?.balance || 0) / 1e6;
    const alerts: Array<{
      id: string;
      type: "LOW_BALANCE" | "FAILED_TASK" | "SERVICE_DOWN";
      title: string;
      message: string;
      severity: "warning" | "error" | "info";
      timestamp: number;
      actionUrl?: string;
    }> = [];

    // 1. Low balance alert
    if (buyerBalance < 2.0) {
      alerts.push({
        id: "alert-low-balance",
        type: "LOW_BALANCE",
        title: "⚠️ Low Balance Alert",
        message: `Your Buyer Wallet has only $${buyerBalance.toFixed(4)} USDC remaining. Add funds to prevent agent execution pauses.`,
        severity: buyerBalance < 0.5 ? "error" : "warning",
        timestamp: Date.now(),
        actionUrl: "/mobile?tab=balance",
      });
    }

    // 2. Failed task / schema rejected alerts
    failedEntries.forEach((entry) => {
      alerts.push({
        id: `alert-failed-${entry._id}`,
        type: "FAILED_TASK",
        title: "❌ Schema Validation Disputed",
        message: `Execution on "${entry.serviceName}" failed output schema. $0.00 debited, 100% reimbursed.`,
        severity: "warning",
        timestamp: new Date(entry.createdAt || Date.now()).getTime(),
        actionUrl: `/tx/${entry.txHash || "dispute"}`,
      });
    });

    // 3. Service down alerts
    services.forEach((s) => {
      if (s.health?.status === "DOWN" || s.active === false) {
        alerts.push({
          id: `alert-down-${s._id}`,
          type: "SERVICE_DOWN",
          title: "🔴 Service Node Down",
          message: `Endpoint "${s.name}" is offline (${s.endpoint}). Autonomous agent will route to ranked fallback.`,
          severity: "error",
          timestamp: new Date(s.health?.lastChecked || Date.now()).getTime(),
          actionUrl: "/mobile?tab=services",
        });
      } else if (s.health?.status === "DEGRADED" || s.health?.status === "SCHEMA_MISMATCH") {
        alerts.push({
          id: `alert-deg-${s._id}`,
          type: "SERVICE_DOWN",
          title: "🟡 Service Degraded SLA",
          message: `Endpoint "${s.name}" reported high latency (${s.health?.latencyMs}ms) or schema mismatch.`,
          severity: "warning",
          timestamp: new Date(s.health?.lastChecked || Date.now()).getTime(),
          actionUrl: "/mobile?tab=services",
        });
      }
    });

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
      unreadCount: alerts.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
