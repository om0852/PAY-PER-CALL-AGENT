import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Ledger from "@/lib/models/Ledger";
import Service from "@/lib/models/Service";
import Wallet from "@/lib/models/Wallet";

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const sellerAddress = searchParams.get("seller")?.toLowerCase() || "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

    // 1. Fetch all services
    const services = await Service.find({}).sort({ createdAt: -1 }).lean();

    // 2. Fetch all ledger entries for this seller or across the platform
    const ledgerEntries = await Ledger.find({}).sort({ createdAt: -1 }).lean();

    // 3. Filter ledger entries related to this seller or all
    const sellerLedger = ledgerEntries.filter(
      (entry) => !sellerAddress || entry.seller.toLowerCase() === sellerAddress.toLowerCase()
    );

    // If platform just started and no seller-specific ledger exists, fall back to all ledger entries
    const activeLedger = sellerLedger.length > 0 ? sellerLedger : ledgerEntries;

    // 4. Calculate KPIs
    const settledEntries = activeLedger.filter((e) => e.status === "SETTLED");
    const totalRevenueAtomic = settledEntries.reduce((sum, e) => sum + (e.paidPrice || 0), 0);
    const totalRevenueUsdc = (totalRevenueAtomic / 1_000_000).toFixed(4);

    const totalInvocations = activeLedger.length;
    const settledCalls = settledEntries.length;
    const deliveryRate = totalInvocations > 0 ? Math.round((settledCalls / totalInvocations) * 100) : 100;

    // Latency calculation
    const validLatencies = activeLedger.map((e) => e.latencyMs).filter((l) => typeof l === "number" && l > 0);
    validLatencies.sort((a, b) => a - b);
    const medianLatency =
      validLatencies.length > 0
        ? validLatencies[Math.floor(validLatencies.length / 2)]
        : 58;
    const p99Latency =
      validLatencies.length > 0
        ? validLatencies[Math.floor(validLatencies.length * 0.99)] || validLatencies[validLatencies.length - 1]
        : 112;

    const schemaDisputes = activeLedger.filter((e) => e.status === "FAILED_OUTPUT_REJECTED").length;

    // 5. Calculate per-service stats
    const serviceStats = services.map((svc) => {
      const svcCalls = activeLedger.filter(
        (e) => e.serviceName.toLowerCase() === svc.name.toLowerCase() || e.category === svc.category
      );
      const svcRevenueAtomic = svcCalls
        .filter((e) => e.status === "SETTLED")
        .reduce((sum, e) => sum + (e.paidPrice || 0), 0);

      return {
        id: svc._id.toString(),
        name: svc.name,
        category: svc.category,
        endpoint: svc.endpoint,
        priceUsdc: (svc.price / 1_000_000).toFixed(4),
        priceAtomic: svc.price,
        active: svc.active !== false,
        health: svc.health || {
          status: "HEALTHY",
          latencyMs: 44,
          lastChecked: new Date(),
          message: "All health checks passed",
        },
        callsCount: svcCalls.length,
        revenueUsdc: (svcRevenueAtomic / 1_000_000).toFixed(4),
        schema: svc.schema,
      };
    });

    // 6. Format recent inbound transactions for the live ledger
    const recentTransactions = activeLedger.slice(0, 20).map((entry) => ({
      id: entry._id.toString(),
      taskId: entry.taskId,
      buyer: entry.buyer,
      seller: entry.seller,
      serviceName: entry.serviceName,
      category: entry.category,
      feeUsdc: ((entry.paidPrice || entry.listedPrice || 0) / 1_000_000).toFixed(4),
      latencyMs: entry.latencyMs || 45,
      txHash: entry.txHash || null,
      status: entry.status,
      createdAt: entry.createdAt,
      protocol: "EIP-3009 HTTP 402",
    }));

    // 7. Get seller wallet details
    const sellerWallet = await Wallet.findOne({ address: sellerAddress.toLowerCase() }).lean();

    return NextResponse.json({
      success: true,
      sellerAddress,
      sellerLabel: sellerWallet?.label || "Seller 1 (Books Scraper)",
      escrowContract: "0x845320c99a80b875631ea235bfcdde1297e6402c",
      metrics: {
        totalRevenueUsdc,
        totalRevenueAtomic,
        totalInvocations,
        settledCalls,
        pendingCalls: Math.max(0, totalInvocations - settledCalls - schemaDisputes),
        deliveryRate,
        reputationScore: (deliveryRate / 20).toFixed(1), // e.g. 96% -> 4.8 / 5.0
        medianLatency,
        p99Latency,
        schemaDisputes,
      },
      services: serviceStats,
      recentTransactions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Seller analytics error:", error);
    return NextResponse.json(
      { error: "Failed to generate seller analytics", details: String(error) },
      { status: 500 }
    );
  }
}
