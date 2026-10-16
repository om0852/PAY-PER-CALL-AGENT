import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import Webhook from "@/lib/models/Webhook";

export interface WebhookEventPayload {
  event: "settlement.completed" | "balance.low" | "task.failed" | "service.status_changed" | "ping";
  timestamp: number;
  data: Record<string, any>;
}

export function signPayload(payloadString: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payloadString).digest("hex");
}

export async function dispatchWebhookEvent(
  event: WebhookEventPayload["event"],
  data: Record<string, any>
): Promise<{ dispatchedCount: number; results: any[] }> {
  try {
    await connectToDatabase();
    const webhooks = await Webhook.find({ active: true, events: event }).lean();

    if (webhooks.length === 0) {
      return { dispatchedCount: 0, results: [] };
    }

    const payloadObj: WebhookEventPayload = {
      event,
      timestamp: Date.now(),
      data,
    };
    const payloadString = JSON.stringify(payloadObj);

    const results = await Promise.all(
      webhooks.map(async (hook) => {
        const signature = signPayload(payloadString, hook.secret);
        const startTime = Date.now();
        let statusCode = 0;
        let success = false;
        let errorMessage: string | null = null;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const res = await fetch(hook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-AgentBucket-Signature": signature,
              "X-AgentBucket-Event": event,
              "X-AgentBucket-Delivery": crypto.randomUUID(),
              "User-Agent": "AgentBucket-Webhook-Relay/2.4",
            },
            body: payloadString,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          statusCode = res.status;
          success = res.ok;
        } catch (err: any) {
          errorMessage = err.message || "Connection refused or timed out";
          statusCode = 504;
        }

        const latencyMs = Date.now() - startTime;

        // Update webhook record in background
        await Webhook.findByIdAndUpdate(hook._id, {
          $set: {
            lastDeliveredAt: new Date(),
            lastStatusCode: statusCode,
          },
          $inc: { deliveryCount: 1 },
        }).catch(() => {});

        return {
          webhookId: hook._id.toString(),
          url: hook.url,
          statusCode,
          success,
          latencyMs,
          errorMessage,
        };
      })
    );

    return { dispatchedCount: webhooks.length, results };
  } catch (error) {
    console.error("Webhook dispatch error:", error);
    return { dispatchedCount: 0, results: [] };
  }
}
