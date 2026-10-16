import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Ledger from "@/lib/models/Ledger";


export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    const query = taskId ? { taskId } : {};
    const rawLogs = await Ledger.find(query).sort({ createdAt: -1 }).limit(100).lean();
    const logs = rawLogs.map((l) => ({
      ...l,
      _id: l._id.toString(),
      id: l._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      logs,
      ledger: logs,
      count: logs.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
