import { NextResponse } from "next/server";
import { settlePayment } from "@/lib/x402/facilitator";
import { SettleRequest } from "@/lib/x402/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SettleRequest;
    const result = await settlePayment(body);

    if (!result.settled) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ settled: false, error: msg }, { status: 500 });
  }
}
