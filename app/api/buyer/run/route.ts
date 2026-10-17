import { NextResponse } from "next/server";
import crypto from "crypto";
import { runBuyerAgent } from "@/lib/x402/buyerAgent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { task, budget, maxConcurrency, taskId: incomingTaskId, xml, input } = body;

    if (!task) {
      return NextResponse.json({ error: "Task description is required" }, { status: 400 });
    }

    const taskId = incomingTaskId || ("task-" + crypto.randomUUID().slice(0, 8));
    const parsedBudget = budget ? Number(budget) : 500000; // default 0.50 USDC (500000 atomic units)
    const parsedConcurrency = maxConcurrency ? Number(maxConcurrency) : 3;

    const buyerAddress =
      body.buyerAddress ||
      body.buyer ||
      req.headers.get("x-buyer-address") ||
      req.headers.get("x-buyer") ||
      undefined;

    const forwardedProto = req.headers.get("x-forwarded-proto");
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost || req.headers.get("host") || "localhost:3000";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const proto = forwardedProto || (isLocal ? "http" : "https");

    let appBaseUrl = process.env.APP_BASE_URL;
    if (!appBaseUrl) {
      if (process.env.VERCEL_URL) {
        appBaseUrl = `https://${process.env.VERCEL_URL}`;
      } else if (isLocal) {
        const port = host.includes(":") ? host.split(":")[1] : "3000";
        appBaseUrl = `http://127.0.0.1:${port}`;
      } else {
        appBaseUrl = `${proto}://${host}`;
      }
    }

    // Execute run synchronously for full result or allow client to stream via taskId
    const result = await runBuyerAgent(
      taskId,
      task,
      parsedBudget,
      parsedConcurrency,
      appBaseUrl,
      { xml, input, buyerAddress }
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
