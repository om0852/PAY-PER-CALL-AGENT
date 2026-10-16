import { subscribeToRun, AgentStepEvent } from "@/lib/x402/buyerAgent";


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return new Response("Missing taskId", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "CONNECTED", taskId, timestamp: Date.now() })}\n\n`)
      );

      const unsubscribe = subscribeToRun(taskId, (event: AgentStepEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          if (event.type === "TASK_COMPLETED") {
            setTimeout(() => {
              try {
                controller.close();
              } catch {
                // ignore
              }
            }, 1000);
          }
        } catch {
          // Stream error or client disconnected
        }
      });

      req.signal.addEventListener("abort", () => {
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
