import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Ledger from "@/lib/models/Ledger";


export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    const query = taskId ? { taskId } : {};
    const logs = await Ledger.find(query).sort({ createdAt: -1 }).limit(100).lean();

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
