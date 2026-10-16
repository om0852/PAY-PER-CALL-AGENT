import { NextResponse } from "next/server";
import { withPayment } from "@/lib/x402/middleware";
import { SELLER_WALLETS } from "@/lib/x402/seed";

const outputSchema = {
  type: "object",
  required: ["success", "rootTag", "data", "elementCount", "convertedAt"],
  properties: {
    success: { type: "boolean" },
    rootTag: { type: "string" },
    data: { type: "object" },
    elementCount: { type: "number" },
    convertedAt: { type: "string" },
  },
};

/**
 * Lightweight, zero-dependency XML-to-JSON parser
 */
function parseXmlToJson(xmlStr: string): { rootTag: string; data: Record<string, unknown>; elementCount: number } {
  // Clean whitespace & XML declaration / doctype
  const clean = xmlStr
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  if (!clean) {
    return {
      rootTag: "empty",
      data: { message: "No XML content provided" },
      elementCount: 0,
    };
  }

  let elementCount = 0;

  // Simple recursive XML tag parser
  function parseNode(xml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const tagRegex = /<([a-zA-Z0-9_\-:]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9_\-:]+)([^>]*?)\/>/g;
    let match;
    let hasMatches = false;

    while ((match = tagRegex.exec(xml)) !== null) {
      hasMatches = true;
      elementCount++;
      const tagName = match[1] || match[4];
      const rawAttrs = match[2] || match[5] || "";
      const innerContent = match[3] !== undefined ? match[3].trim() : "";

      // Parse attributes
      const attrs: Record<string, string> = {};
      const attrRegex = /([a-zA-Z0-9_\-:]+)="([^"]*)"|([a-zA-Z0-9_\-:]+)='([^']*)'/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
        const k = attrMatch[1] || attrMatch[3];
        const v = attrMatch[2] || attrMatch[4];
        attrs[k] = v;
      }

      let parsedValue: unknown;
      if (innerContent.includes("<")) {
        parsedValue = parseNode(innerContent);
      } else {
        // Cast boolean or numbers if applicable
        if (innerContent === "true") parsedValue = true;
        else if (innerContent === "false") parsedValue = false;
        else if (!isNaN(Number(innerContent)) && innerContent !== "") parsedValue = Number(innerContent);
        else parsedValue = innerContent;
      }

      if (Object.keys(attrs).length > 0) {
        if (typeof parsedValue === "object" && parsedValue !== null) {
          (parsedValue as Record<string, unknown>)["@attributes"] = attrs;
        } else {
          parsedValue = { "@attributes": attrs, value: parsedValue };
        }
      }

      // Handle duplicate tags as arrays
      if (result[tagName]) {
        if (!Array.isArray(result[tagName])) {
          result[tagName] = [result[tagName]];
        }
        (result[tagName] as unknown[]).push(parsedValue);
      } else {
        result[tagName] = parsedValue;
      }
    }

    if (!hasMatches) {
      return { text: xml.trim() };
    }

    return result;
  }

  // Find root tag
  const rootMatch = clean.match(/<([a-zA-Z0-9_\-:]+)/);
  const rootTag = rootMatch ? rootMatch[1] : "root";
  const parsed = parseNode(clean);

  return {
    rootTag,
    data: parsed,
    elementCount: Math.max(1, elementCount),
  };
}

async function handler(req: Request) {
  let xmlInput = "";

  try {
    const body = await req.json();
    if (typeof body?.xml === "string" && body.xml.trim()) {
      xmlInput = body.xml.trim();
    } else if (typeof body?.content === "string" && body.content.trim()) {
      xmlInput = body.content.trim();
    }
  } catch {
    // Default sample XML for demonstration
  }

  if (!xmlInput) {
    xmlInput = `<dataset version="2.0">
  <organization name="AgentBucket Labs" status="verified">
    <node id="node-01" region="us-east" active="true">
      <serviceName>Base Sepolia Settlement Node</serviceName>
      <capacity unit="tps">450</capacity>
      <latencyMs>42</latencyMs>
      <sponsoredGas>0.00</sponsoredGas>
    </node>
    <node id="node-02" region="eu-west" active="true">
      <serviceName>Books Scraper Pro Sentinel</serviceName>
      <capacity unit="tps">180</capacity>
      <latencyMs>58</latencyMs>
    </node>
  </organization>
</dataset>`;
  }

  const { rootTag, data, elementCount } = parseXmlToJson(xmlInput);

  return NextResponse.json({
    success: true,
    rootTag,
    data,
    elementCount,
    convertedAt: new Date().toISOString(),
  });
}

// Protected by HTTP 402 withPayment middleware
export const POST = withPayment(handler, {
  category: "data",
  price: 30000, // 0.0300 USDC
  payTo: SELLER_WALLETS.reportGen, // Seller node
  outputSchema,
});
