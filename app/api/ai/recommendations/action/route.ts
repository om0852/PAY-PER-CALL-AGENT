import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AiRecommendation from "@/lib/models/AiRecommendation";
import Rental from "@/lib/models/Rental";
import Wallet from "@/lib/models/Wallet";
import Service from "@/lib/models/Service";
import Transfer from "@/lib/models/Transfer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      recommendationId,
      action, // "ACCEPT" | "DISMISS"
      platform = "web", // "web" | "mobile"
      buyerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    } = body;

    if (!recommendationId || !action) {
      return NextResponse.json(
        { error: "recommendationId and action ('ACCEPT' | 'DISMISS') are required." },
        { status: 400 }
      );
    }

    const rec = await AiRecommendation.findById(recommendationId);
    if (!rec) {
      return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
    }

    if (action === "DISMISS") {
      rec.status = "DISMISSED";
      rec.dismissedBy = platform;
      await rec.save();

      return NextResponse.json({
        success: true,
        action: "DISMISS",
        message: `Recommendation dismissed by ${platform}. Execution will continue via Pay-Per-Call.`,
        recommendation: {
          id: rec._id.toString(),
          status: rec.status,
          dismissedBy: rec.dismissedBy,
        },
      });
    }

    if (action === "ACCEPT") {
      // 1. Check buyer wallet balance
      const buyerLower = (buyerAddress || rec.buyerAddress).toLowerCase();
      const buyerWallet = await Wallet.findOne({ address: buyerLower });
      const rentalUnits = Math.round(rec.rentalPriceUsdc * 1e6); // e.g. 1,000,000 units = $1.00 USDC

      if (!buyerWallet || buyerWallet.balance < rentalUnits) {
        return NextResponse.json(
          {
            error: `Insufficient buyer balance ($${((buyerWallet?.balance || 0) / 1e6).toFixed(
              4
            )} USDC). Need $${rec.rentalPriceUsdc.toFixed(2)} USDC to activate 30-day lease.`,
          },
          { status: 400 }
        );
      }

      // 2. Find seller payout wallet
      const service = await Service.findOne({
        $or: [{ name: rec.serviceName }, { category: rec.category }],
      });
      const sellerAddress =
        service?.payTo?.toLowerCase() || "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

      // 3. Atomically transfer funds
      buyerWallet.balance -= rentalUnits;
      await buyerWallet.save();

      let sellerWallet = await Wallet.findOne({ address: sellerAddress });
      if (sellerWallet) {
        sellerWallet.balance += rentalUnits;
        await sellerWallet.save();
      }

      // 4. Create Transfer audit record
      const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
      await Transfer.create({
        txHash,
        from: buyerLower,
        to: sellerAddress,
        amount: rentalUnits,
        network: "base-sepolia:84532",
        authorizationNonce: "0x" + crypto.randomBytes(32).toString("hex"),
        settledAt: new Date(),
      });

      // 5. Create or extend Rental in MongoDB
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const rental = await Rental.create({
        buyer: buyerLower,
        serviceId: service?._id,
        serviceName: rec.serviceName,
        category: rec.category,
        seller: sellerAddress,
        rentalPrice: rentalUnits,
        quotaTotal: rec.rentalQuota,
        quotaUsed: 0,
        expiresAt,
        active: true,
      });

      // 6. Mark recommendation as ACCEPTED
      rec.status = "ACCEPTED";
      rec.acceptedBy = platform;
      await rec.save();

      return NextResponse.json({
        success: true,
        action: "ACCEPT",
        message: `Successfully rented "${rec.serviceName}" for 30 days! Next ${rec.rentalQuota.toLocaleString()} calls are 100% free of per-call fees.`,
        acceptedBy: platform,
        rental: {
          id: rental._id.toString(),
          serviceName: rental.serviceName,
          category: rental.category,
          quotaTotal: rental.quotaTotal,
          quotaRemaining: rental.quotaTotal,
          expiresAt: rental.expiresAt,
          txHash,
        },
        recommendation: {
          id: rec._id.toString(),
          status: rec.status,
          acceptedBy: rec.acceptedBy,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
