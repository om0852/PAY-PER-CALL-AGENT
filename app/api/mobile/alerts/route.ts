import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Wallet from "@/lib/models/Wallet";
import Notification from "@/lib/models/Notification";
import { runHealthCheckForServices } from "@/lib/x402/healthChecker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Fetch real notifications from MongoDB
    let dbNotifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // If none exist, trigger an SLA health audit to generate real live alerts
    if (dbNotifications.length === 0) {
      try {
        await runHealthCheckForServices();
        dbNotifications = await Notification.find({})
          .sort({ createdAt: -1 })
          .limit(30)
          .lean();
      } catch (e) {
        console.warn("Could not run initial health check:", e);
      }
    }

    // 2. Fetch Buyer Wallet for real-time low balance detection
    const buyerWallet = await Wallet.findOne({ role: "buyer" }).lean();
    const buyerBalance = (buyerWallet?.balance || 0) / 1e6;

    const alerts: Array<{
      id: string;
      type: "LOW_BALANCE" | "FAILED_TASK" | "SERVICE_DOWN";
      title: string;
      message: string;
      severity: "warning" | "error" | "info";
      timestamp: number;
      read?: boolean;
      serviceName?: string;
      actionUrl?: string;
    }> = [];

    // Low balance alert if applicable
    if (buyerBalance < 2.0) {
      alerts.push({
        id: "alert-low-balance",
        type: "LOW_BALANCE",
        title: "⚠️ Low Agent Balance Alert",
        message: `Your Buyer Wallet has $${buyerBalance.toFixed(4)} USDC remaining (threshold: $2.00 USDC). Top up to maintain autonomous execution.`,
        severity: buyerBalance < 0.5 ? "error" : "warning",
        timestamp: Date.now(),
        read: false,
        actionUrl: "/mobile?tab=wallet",
      });
    }

    // Map real database notifications from health checker & agent disputes
    dbNotifications.forEach((n: any) => {
      let alertType: "LOW_BALANCE" | "FAILED_TASK" | "SERVICE_DOWN" = "SERVICE_DOWN";
      if (n.type === "SCHEMA_MISMATCH") alertType = "FAILED_TASK";
      else if (n.type === "ENDPOINT_DOWN" || n.type === "HEALTH_ALERT") alertType = "SERVICE_DOWN";

      alerts.push({
        id: n._id.toString(),
        type: alertType,
        title: n.title,
        message: n.message,
        severity: n.severity || "warning",
        timestamp: new Date(n.createdAt || Date.now()).getTime(),
        read: n.read || false,
        serviceName: n.serviceName,
        actionUrl: "/mobile?tab=services",
      });
    });

    const unreadCount = alerts.filter((a) => !a.read).length;

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    // Trigger live SLA health audit across all registered services
    if (body.action === "RUN_HEALTH_CHECK") {
      const auditResult = await runHealthCheckForServices(true);
      const dbNotifications = await Notification.find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      return NextResponse.json({
        success: true,
        message: "SLA Health Check completed. Real alerts generated.",
        auditResult,
        notificationsCount: dbNotifications.length,
      });
    }

    if (body.action === "MARK_ALL_READ") {
      await Notification.updateMany({ read: false }, { $set: { read: true } });
      return NextResponse.json({ success: true, message: "All alerts marked as read." });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
