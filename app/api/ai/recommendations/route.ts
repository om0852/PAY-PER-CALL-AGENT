import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AiRecommendation from "@/lib/models/AiRecommendation";
import Rental from "@/lib/models/Rental";
import Service from "@/lib/models/Service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const buyerAddress = (
      searchParams.get("buyer") || "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    ).toLowerCase();
    const status = searchParams.get("status") || "PENDING";

    // 1. Fetch latest pending recommendation for this buyer
    const pendingRec = await AiRecommendation.findOne({
      buyerAddress,
      status: "PENDING",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!pendingRec) {
      return NextResponse.json({ success: true, recommendation: null });
    }

    // 2. Check if the user already has an active lease for this service or category
    const activeLease = await Rental.findOne({
      buyer: buyerAddress,
      $or: [{ serviceName: pendingRec.serviceName }, { category: pendingRec.category }],
      active: true,
      expiresAt: { $gt: new Date() },
    }).lean();

    // If already rented, auto-accept this recommendation so the modal dismisses automatically
    if (activeLease) {
      await AiRecommendation.findByIdAndUpdate(pendingRec._id, {
        status: "ACCEPTED",
        acceptedBy: "system",
      });
      return NextResponse.json({ success: true, recommendation: null });
    }

    return NextResponse.json({
      success: true,
      recommendation: {
        id: pendingRec._id.toString(),
        buyerAddress: pendingRec.buyerAddress,
        serviceName: pendingRec.serviceName,
        category: pendingRec.category,
        status: pendingRec.status,
        callCount: pendingRec.callCount,
        payPerCallPriceUsdc: pendingRec.payPerCallPriceUsdc,
        rentalPriceUsdc: pendingRec.rentalPriceUsdc,
        rentalQuota: pendingRec.rentalQuota,
        projectedPayPerCallCost: pendingRec.projectedPayPerCallCost,
        netSavingsUsdc: pendingRec.netSavingsUsdc,
        savingsPercent: pendingRec.savingsPercent,
        llmAnalysis: pendingRec.llmAnalysis,
        createdAt: pendingRec.createdAt,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const buyerAddress = (
      body.buyerAddress || "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    ).toLowerCase();
    const serviceName = body.serviceName || "Books Scraper Pro";
    const category = body.category || "scraping";
    const callCount = Number(body.callCount) || 10000;
    const perCallPriceUsdc = Number(body.perCallPriceUsdc) || 0.05;
    const rentalPriceUsdc = Number(body.rentalPriceUsdc) || 1.0;
    const rentalQuota = Number(body.rentalQuota) || 10000;

    // Check if buyer already holds an active lease
    const existingLease = await Rental.findOne({
      buyer: buyerAddress,
      $or: [{ serviceName }, { category }],
      active: true,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (existingLease && !body.forceSimulation) {
      return NextResponse.json({
        success: false,
        message: `Service "${serviceName}" is already actively leased by this buyer.`,
        activeLease: {
          category: existingLease.category,
          expiresAt: existingLease.expiresAt,
          remaining: Math.max(0, existingLease.quotaTotal - existingLease.quotaUsed),
        },
      });
    }

    const projectedPayPerCallCost = Number((callCount * perCallPriceUsdc).toFixed(2));
    const netSavingsUsdc = Number((projectedPayPerCallCost - rentalPriceUsdc).toFixed(2));
    const savingsPercent = Number(
      ((netSavingsUsdc / projectedPayPerCallCost) * 100).toFixed(1)
    );

    const llmAnalysis =
      body.llmAnalysis ||
      `🤖 AI Financial Optimization Advisor: High-volume invocation velocity detected (${callCount.toLocaleString()} calls). Continuing on Pay-Per-Call ($${perCallPriceUsdc.toFixed(4)}/call) will cost $${projectedPayPerCallCost.toFixed(2)} USDC. Switching to a 30-Day Flat Rental ($${rentalPriceUsdc.toFixed(2)} USDC for ${rentalQuota.toLocaleString()} calls) reduces your effective unit price to $0.0001/call, saving $${netSavingsUsdc.toFixed(2)} USDC (${savingsPercent}% discount) with zero per-transaction signature latency on Base Sepolia.`;

    // Dismiss any previous pending recommendations for this category to avoid stale cards
    await AiRecommendation.updateMany(
      { buyerAddress, category, status: "PENDING" },
      { status: "DISMISSED", dismissedBy: "system" }
    );

    const newRec = await AiRecommendation.create({
      buyerAddress,
      serviceName,
      category,
      status: "PENDING",
      callCount,
      payPerCallPriceUsdc: perCallPriceUsdc,
      rentalPriceUsdc,
      rentalQuota,
      projectedPayPerCallCost,
      netSavingsUsdc,
      savingsPercent,
      llmAnalysis,
    });

    return NextResponse.json({
      success: true,
      message: "AI Rental Recommendation generated successfully.",
      recommendation: {
        id: newRec._id.toString(),
        buyerAddress: newRec.buyerAddress,
        serviceName: newRec.serviceName,
        category: newRec.category,
        status: newRec.status,
        callCount: newRec.callCount,
        payPerCallPriceUsdc: newRec.payPerCallPriceUsdc,
        rentalPriceUsdc: newRec.rentalPriceUsdc,
        rentalQuota: newRec.rentalQuota,
        projectedPayPerCallCost: newRec.projectedPayPerCallCost,
        netSavingsUsdc: newRec.netSavingsUsdc,
        savingsPercent: newRec.savingsPercent,
        llmAnalysis: newRec.llmAnalysis,
        createdAt: newRec.createdAt,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
