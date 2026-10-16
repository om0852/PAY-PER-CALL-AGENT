import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Service from "@/lib/models/Service";
import Ledger from "@/lib/models/Ledger";
import { ensureSeededData } from "@/lib/x402/seed";
import { runHealthCheckForServices } from "@/lib/x402/healthChecker";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    await ensureSeededData();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const maxPrice = searchParams.get("maxPrice");

    const query: Record<string, unknown> = { active: true };
    if (category) {
      query.category = category;
    }
    if (maxPrice) {
      query.price = { $lte: Number(maxPrice) };
    }

    const services = await Service.find(query).lean();

    // Dynamically compute reputation from Ledger for each service's seller
    const enrichedServices = await Promise.all(
      services.map(async (svc) => {
        const sellerAddress = svc.payTo.toLowerCase();

        const logs = await Ledger.find({ seller: sellerAddress }).lean();
        const totalCalls = logs.length;
        const successfulCalls = logs.filter((l) => l.status === "SETTLED").length;
        const rejectedCalls = logs.filter(
          (l) => l.status === "FAILED_OUTPUT_REJECTED"
        ).length;

        let successRate = 100;
        let medianLatencyMs = 250;

        if (totalCalls > 0) {
          successRate = Math.round((successfulCalls / totalCalls) * 100);

          const latencies = logs.map((l) => l.latencyMs).sort((a, b) => a - b);
          medianLatencyMs = latencies[Math.floor(latencies.length / 2)] || 250;
        }

        // Reputation score: 0 to 100
        const reputationScore = Math.max(
          0,
          Math.min(100, successRate - rejectedCalls * 20)
        );

        return {
          id: svc._id.toString(),
          name: svc.name,
          category: svc.category,
          endpoint: svc.endpoint,
          price: svc.price,
          asset: svc.asset,
          network: svc.network,
          payTo: svc.payTo,
          schema: svc.schema,
          active: svc.active,
          health: svc.health || {
            status: "DOWN",
            lastChecked: new Date(),
            latencyMs: 0,
            message: "Awaiting initial health audit",
          },
          reputation: {
            score: reputationScore,
            successRate,
            medianLatencyMs,
            totalCalls,
            rejectedCalls,
          },
        };
      })
    );

    return NextResponse.json({ services: enrichedServices });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const { name, category, endpoint, price, asset, network, payTo, schema } = body;
    if (!name || !category || !endpoint || price === undefined || !payTo) {
      return NextResponse.json(
        { error: "Missing required service registration fields" },
        { status: 400 }
      );
    }

    const trimmedEndpoint = String(endpoint).trim();

    const newService = await Service.create({
      name: String(name).trim(),
      category,
      endpoint: trimmedEndpoint,
      price: Number(price),
      asset: asset || "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: network || "eip155:84532",
      payTo: payTo.toLowerCase(),
      schema: schema || {},
      active: true,
      health: {
        status: "DOWN",
        lastChecked: new Date(),
        latencyMs: 0,
        message: "Verifying endpoint...",
      },
    });

    // Run health check right away so this service is immediately classified correctly
    try {
      await runHealthCheckForServices();
    } catch {
      // non-fatal
    }

    const verifiedService = await Service.findById(newService._id).lean();

    return NextResponse.json({ service: verifiedService || newService }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      try {
        const body = await req.json();
        id = body.id || body.serviceId;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "Missing service id to delete" }, { status: 400 });
    }

    const deleted = await Service.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Service "${deleted.name}" deleted successfully`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
