import { NextResponse } from "next/server";
import { runHealthCheckForServices } from "@/lib/x402/healthChecker";
import { connectToDatabase } from "@/lib/mongodb";
import Service from "@/lib/models/Service";

export async function POST() {
  try {
    const results = await runHealthCheckForServices(true);
    const healthyCount = results.filter((r) => r.status === "HEALTHY").length;
    const alertCount = results.filter((r) => r.status !== "HEALTHY").length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        healthy: healthyCount,
        alerts: alertCount,
      },
      results,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const services = await Service.find({ active: true }, "name category endpoint price payTo health").lean();

    return NextResponse.json({
      success: true,
      services: services.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        category: s.category,
        endpoint: s.endpoint,
        price: s.price,
        health: s.health || {
          status: "DOWN",
          lastChecked: new Date(),
          latencyMs: 0,
          message: "Awaiting initial audit",
        },
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
