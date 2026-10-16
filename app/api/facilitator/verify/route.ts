import { NextResponse } from "next/server";
import { verifyPayment } from "@/lib/x402/facilitator";
import { VerifyRequest } from "@/lib/x402/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyRequest;
    const result = await verifyPayment(body);

    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ valid: false, error: msg }, { status: 500 });
  }
}
