import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Wallet from "@/lib/models/Wallet";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const amountUsdc = Number(body?.amountUsdc || 5);

    if (isNaN(amountUsdc) || amountUsdc <= 0 || amountUsdc > 100) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid top-up amount between 1 and 100 USDC" },
        { status: 400 }
      );
    }

    const atomicUnits = Math.round(amountUsdc * 1_000_000);
    const buyerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
    let wallet = await Wallet.findOne({ role: "buyer" });
    if (!wallet) {
      wallet = await Wallet.findOne({ address: buyerAddress });
    }

    if (!wallet) {
      wallet = await Wallet.create({
        address: buyerAddress,
        role: "buyer",
        label: "Buyer Agent Wallet",
        balance: atomicUnits,
      });
    } else {
      wallet.balance = (wallet.balance || 0) + atomicUnits;
      await wallet.save();
    }

    const newBalanceUsdc = (wallet.balance / 1e6).toFixed(4);

    return NextResponse.json({
      success: true,
      message: `Successfully deposited +$${amountUsdc.toFixed(2)} USDC into Buyer Agent account!`,
      newBalanceUsdc,
      addedAmountUsdc: amountUsdc,
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
