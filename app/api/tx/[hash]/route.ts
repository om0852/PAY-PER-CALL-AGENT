import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Transfer from "@/lib/models/Transfer";
import Authorization from "@/lib/models/Authorization";
import Ledger from "@/lib/models/Ledger";


export async function GET(
  req: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    await connectToDatabase();
    const { hash } = await params;

    const transfer = await Transfer.findOne({ txHash: hash }).lean();
    if (!transfer) {
      return NextResponse.json(
        { error: "Transaction not found on simulated chain" },
        { status: 404 }
      );
    }

    const auth = await Authorization.findOne({
      from: transfer.from,
      nonce: transfer.authorizationNonce,
    }).lean();

    const ledgerEntry = await Ledger.findOne({ txHash: hash }).lean();

    return NextResponse.json({
      transaction: {
        txHash: transfer.txHash,
        status: "CONFIRMED",
        blockNumber: 21498000 + Math.floor(Math.random() * 500),
        network: transfer.network,
        settledAt: transfer.settledAt,
        gasSponsored: "$0.00 (Gas Sponsored by Facilitator)",
        from: transfer.from,
        to: transfer.to,
        amount: transfer.amount,
        usdcAmount: (transfer.amount / 1e6).toFixed(6),
        authorization: auth
          ? {
              from: auth.from,
              to: auth.to,
              value: auth.value,
              validAfter: auth.validAfter,
              validBefore: auth.validBefore,
              nonce: auth.nonce,
              status: auth.status,
            }
          : null,
        signature: transfer.signature || {
          v: 28,
          r: "0x" + "a".repeat(64),
          s: "0x" + "b".repeat(64),
        },
        ecdsaValid: true,
        service: ledgerEntry
          ? {
              name: ledgerEntry.serviceName,
              category: ledgerEntry.category,
              latencyMs: ledgerEntry.latencyMs,
            }
          : null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
