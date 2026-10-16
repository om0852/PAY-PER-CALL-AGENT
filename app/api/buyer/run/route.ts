import { NextResponse } from "next/server";
import crypto from "crypto";
import { runBuyerAgent } from "@/lib/x402/buyerAgent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { task, budget, maxConcurrency, taskId: incomingTaskId } = body;

    if (!task) {
      return NextResponse.json({ error: "Task description is required" }, { status: 400 });
    }

    const taskId = incomingTaskId || ("task-" + crypto.randomUUID().slice(0, 8));
    const parsedBudget = budget ? Number(budget) : 500000; // default 0.50 USDC (500000 atomic units)
    const parsedConcurrency = maxConcurrency ? Number(maxConcurrency) : 3;

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const appBaseUrl = `${protocol}://${host}`;

    // Execute run synchronously for full result or allow client to stream via taskId
    const result = await runBuyerAgent(
      taskId,
      task,
      parsedBudget,
      parsedConcurrency,
      appBaseUrl
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
