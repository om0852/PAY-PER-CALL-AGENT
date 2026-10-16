import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import Webhook from "@/lib/models/Webhook";

export async function GET() {
  try {
    await connectToDatabase();
    let webhooks = await Webhook.find({}).sort({ createdAt: -1 }).lean();

    // If empty, seed a sample default webhook for testing
    if (webhooks.length === 0) {
      const defaultHook = await Webhook.create({
        url: "https://api.merchant.io/v1/x402-webhooks",
        secret: "whsec_" + crypto.randomBytes(24).toString("hex"),
        description: "Production Micro-Settlement Event Bridge",
        events: ["settlement.completed", "balance.low", "task.failed", "service.status_changed"],
        active: true,
        lastStatusCode: 200,
        lastDeliveredAt: new Date(),
        deliveryCount: 12,
      });
      webhooks = [defaultHook.toObject()];
    }

    return NextResponse.json({
      success: true,
      webhooks: webhooks.map((w: any) => ({
        id: w._id.toString(),
        url: w.url,
        secret: w.secret,
        events: w.events,
        active: w.active,
        description: w.description,
        lastDeliveredAt: w.lastDeliveredAt,
        lastStatusCode: w.lastStatusCode,
        deliveryCount: w.deliveryCount || 0,
        createdAt: w.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { url, events, description } = body;

    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json(
        { success: false, error: "Valid HTTP or HTTPS webhook URL is required." },
        { status: 400 }
      );
    }

    const secret = "whsec_" + crypto.randomBytes(24).toString("hex");

    const webhook = await Webhook.create({
      url: url.trim(),
      secret,
      events: Array.isArray(events) && events.length > 0 ? events : ["settlement.completed", "balance.low"],
      description: description?.trim() || "Developer Webhook Relay",
      active: true,
      deliveryCount: 0,
    });

    return NextResponse.json({
      success: true,
      message: "Webhook registered successfully!",
      webhook: {
        id: webhook._id.toString(),
        url: webhook.url,
        secret: webhook.secret,
        events: webhook.events,
        active: webhook.active,
        description: webhook.description,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Webhook ID required" }, { status: 400 });
    }

    await Webhook.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Webhook deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
