import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Ledger from "@/lib/models/Ledger";


export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const serviceName = searchParams.get("serviceName");
    const seller = searchParams.get("seller");

    const limitParam = searchParams.get("limit");
    const timeframe = searchParams.get("timeframe");

    const query: Record<string, unknown> = {};
    if (taskId) query.taskId = taskId;
    if (serviceName) {
      const escaped = serviceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.serviceName = { $regex: new RegExp(`^${escaped}$`, "i") };
    }
    if (seller) {
      query.seller = seller.toLowerCase();
    }
    if (timeframe && timeframe !== "All Time") {
      const now = Date.now();
      const windowMs =
        timeframe === "24H"
          ? 24 * 60 * 60 * 1000
          : timeframe === "7D"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
      query.createdAt = { $gte: new Date(now - windowMs) };
    }

    const limit = limitParam !== null ? parseInt(limitParam, 10) : 1000;
    const totalCount = await Ledger.countDocuments(query);
    const queryBuilder = Ledger.find(query).sort({ createdAt: -1 });
    if (limit > 0) {
      queryBuilder.limit(limit);
    }
    const rawLogs = await queryBuilder.lean();
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
      totalCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
