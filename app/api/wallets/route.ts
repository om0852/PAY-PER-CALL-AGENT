import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Wallet from "@/lib/models/Wallet";
import { ensureSeededData } from "@/lib/x402/seed";


export async function GET() {
  try {
    await connectToDatabase();
    await ensureSeededData();

    // Do not expose private keys in the public API
    const wallets = await Wallet.find({}, { privateKey: 0 }).sort({ role: 1 }).lean();

    return NextResponse.json({ wallets });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
