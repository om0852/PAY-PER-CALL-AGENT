import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Ledger from "@/lib/models/Ledger";
import Service from "@/lib/models/Service";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { ledgerId, taskId, serviceName, rating, feedback } = body;

    if (!ledgerId && (!taskId || !serviceName)) {
      return NextResponse.json(
        { error: "ledgerId or taskId + serviceName is required" },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: "Rating must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    // 1. Update Ledger entry (by ledgerId or taskId+serviceName)
    let updatedLedger = null;
    if (ledgerId && mongoose.isValidObjectId(ledgerId)) {
      updatedLedger = await Ledger.findByIdAndUpdate(
        ledgerId,
        {
          $set: {
            userRating: numRating,
            ratingFeedback: feedback ? String(feedback).trim() : null,
          },
        },
        { returnDocument: "after" }
      );
    }

    if (!updatedLedger && taskId && serviceName) {
      updatedLedger = await Ledger.findOneAndUpdate(
        { taskId, serviceName },
        {
          $set: {
            userRating: numRating,
            ratingFeedback: feedback ? String(feedback).trim() : null,
          },
        },
        { returnDocument: "after" }
      );
    }

    if (!updatedLedger) {
      return NextResponse.json(
        { error: "Ledger record not found" },
        { status: 404 }
      );
    }

    // 2. Re-compute aggregate rating for this service/seller in the registry
    const sellerAddress = updatedLedger.seller.toLowerCase();
    const allSellerLogs = await Ledger.find({
      seller: sellerAddress,
      userRating: { $ne: null },
    }).lean();

    const totalRatings = allSellerLogs.length;
    const avgScore =
      totalRatings > 0
        ? Number(
            (
              allSellerLogs.reduce((acc, curr) => acc + (curr.userRating || 5), 0) /
              totalRatings
            ).toFixed(1)
          )
        : numRating;

    await Service.updateMany(
      { payTo: { $regex: new RegExp(`^${sellerAddress}$`, "i") } },
      {
        $set: {
          averageUserRating: avgScore,
          totalRatingsCount: totalRatings,
        },
      }
    );

    return NextResponse.json({
      success: true,
      ledgerId,
      userRating: numRating,
      serviceName: updatedLedger.serviceName,
      averageUserRating: avgScore,
      totalRatings,
      message: `Successfully recorded ${numRating}-star rating for ${updatedLedger.serviceName}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
