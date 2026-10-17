import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Authorization from "@/lib/models/Authorization";
import Transfer from "@/lib/models/Transfer";
import Ledger from "@/lib/models/Ledger";
import Wallet from "@/lib/models/Wallet";
import Rental from "@/lib/models/Rental";
import AiRecommendation from "@/lib/models/AiRecommendation";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { nonces = [], txHashes = [], taskIds = [], buyerAddress } = body;

    let deletedAuthorizations = 0;
    let deletedTransfers = 0;
    let deletedLedgers = 0;

    // 1. Delete generated test authorizations
    if (Array.isArray(nonces) && nonces.length > 0) {
      const authRes = await Authorization.deleteMany({ nonce: { $in: nonces } });
      deletedAuthorizations = authRes.deletedCount || 0;
    }

    // 2. Delete generated test transfers
    if ((Array.isArray(txHashes) && txHashes.length > 0) || (Array.isArray(nonces) && nonces.length > 0)) {
      const transferRes = await Transfer.deleteMany({
        $or: [
          { txHash: { $in: txHashes } },
          { authorizationNonce: { $in: nonces } },
        ],
      });
      deletedTransfers = transferRes.deletedCount || 0;
    }

    // 3. Delete generated test ledger entries
    if ((Array.isArray(taskIds) && taskIds.length > 0) || (Array.isArray(txHashes) && txHashes.length > 0)) {
      const ledgerRes = await Ledger.deleteMany({
        $or: [
          { taskId: { $in: taskIds } },
          { txHash: { $in: txHashes } },
        ],
      });
      deletedLedgers = ledgerRes.deletedCount || 0;
    }

    // 4. Delete generated test rental leases and recommendations if categories provided
    if (Array.isArray(body.categories) && body.categories.length > 0) {
      await Rental.deleteMany({ category: { $in: body.categories } });
      await AiRecommendation.deleteMany({ category: { $in: body.categories } });
    }

    // 5. Restore test buyer wallet balance back to 10.00 USDC (10,000,000 atomic units)
    if (buyerAddress) {
      await Wallet.findOneAndUpdate(
        { address: buyerAddress.toLowerCase() },
        { $set: { balance: 10000000 } }
      );
    }

    return NextResponse.json({
      success: true,
      cleaned: {
        authorizations: deletedAuthorizations,
        transfers: deletedTransfers,
        ledgerEntries: deletedLedgers,
        walletRestored: !!buyerAddress,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
