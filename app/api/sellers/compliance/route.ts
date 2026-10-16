import { NextResponse } from "next/server";
import crypto from "crypto";
import { withPayment } from "@/lib/x402/middleware";
import { SELLER_WALLETS } from "@/lib/x402/seed";

const outputSchema = {
  type: "object",
  required: ["riskScore", "status", "sanctionsClear", "complianceLevel", "auditId"],
  properties: {
    riskScore: { type: "number" },
    status: { type: "string", enum: ["APPROVED", "FLAGGED", "REVIEW_REQUIRED"] },
    sanctionsClear: { type: "boolean" },
    complianceLevel: { type: "string" },
    auditId: { type: "string" },
  },
};

async function handler(req: Request) {
  let target = "Supplier Entity";

  try {
    const body = await req.json();
    if (body?.target) target = String(body.target);
    if (body?.vendor) target = String(body.vendor);
  } catch {
    // default
  }

  const auditId = "aud-" + crypto.randomUUID().slice(0, 10);
  const lower = target.toLowerCase();

  let riskScore = 4; // Low risk (0-100)
  let status: "APPROVED" | "FLAGGED" | "REVIEW_REQUIRED" = "APPROVED";
  let sanctionsClear = true;
  let complianceLevel = "TIER-1-ENTERPRISE-CLEARED";

  if (lower.includes("sanction") || lower.includes("darknet") || lower.includes("illicit")) {
    riskScore = 98;
    status = "FLAGGED";
    sanctionsClear = false;
    complianceLevel = "PROHIBITED-TRANSACTION";
  } else if (lower.includes("unverified") || lower.includes("unknown")) {
    riskScore = 45;
    status = "REVIEW_REQUIRED";
    sanctionsClear = true;
    complianceLevel = "TIER-2-ENHANCED-DILIGENCE";
  }

  return NextResponse.json({
    riskScore,
    status,
    sanctionsClear,
    complianceLevel,
    auditId,
  });
}

export const POST = withPayment(handler, {
  category: "compliance",
  price: 40000, // 0.04 USDC
  payTo: SELLER_WALLETS.compliance,
  outputSchema,
});
