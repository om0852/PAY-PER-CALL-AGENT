import { NextResponse } from "next/server";
import Ajv from "ajv";
import { PaymentChallenge, PaymentSignaturePayload, PaymentResponsePayload } from "./types";
import { verifyPayment, settlePayment } from "./facilitator";
import { connectToDatabase } from "../mongodb";
import Rental from "../models/Rental";

const ajv = new Ajv({ allErrors: true });

export interface SellerConfig {
  category:
    | "scraping"
    | "fx-rates"
    | "summarization"
    | "data"
    | "inference"
    | "sentiment"
    | "crypto-oracle"
    | "compliance"
    | "reporting"
    | string;
  price: number; // Integer atomic units (e.g. 50000 = 0.05 USDC)
  payTo: string;
  outputSchema: Record<string, unknown>;
}

export function withPayment(
  handler: (req: Request, context?: unknown) => Promise<Response>,
  config: SellerConfig
) {
  const validateOutput = ajv.compile(config.outputSchema);

  return async function paymentHandler(req: Request, context?: unknown): Promise<Response> {
    const rawSig =
      req.headers.get("payment-signature") ||
      req.headers.get("x-payment") ||
      req.headers.get("x-payment-signature");

    const network = process.env.NETWORK_ID || "eip155:84532";
    const asset =
      process.env.USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

    // 0. Check for Active Prepaid Rental Quota Lease
    const buyerHeader =
      req.headers.get("x-buyer-address") ||
      req.headers.get("x-buyer") ||
      req.headers.get("x-buyer-account");

    if (buyerHeader) {
      try {
        await connectToDatabase();
        const buyerAddr = buyerHeader.trim().toLowerCase();
        const sellerAddr = config.payTo ? config.payTo.trim().toLowerCase() : null;

        const rentalQuery: Record<string, unknown> = {
          buyer: { $regex: new RegExp(`^${buyerAddr}$`, "i") },
          category: config.category,
          active: true,
          expiresAt: { $gt: new Date() },
          $expr: { $lt: ["$quotaUsed", "$quotaTotal"] },
        };

        if (sellerAddr) {
          rentalQuery.$or = [
            { seller: { $regex: new RegExp(`^${sellerAddr}$`, "i") } },
            { seller: { $exists: false } },
            { seller: null },
          ];
        }

        const rental = await Rental.findOneAndUpdate(
          rentalQuery,
          { $inc: { quotaUsed: 1 } },
          { new: true, returnDocument: "after", sort: { quotaUsed: -1, createdAt: 1 } }
        );

        if (rental) {
          // Quota available! Execute business logic without HTTP 402 challenge
          let handlerResponse: Response;
          try {
            handlerResponse = await handler(req, context);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return NextResponse.json(
              { error: `Seller execution failure: ${msg}` },
              { status: 500 }
            );
          }

          if (!handlerResponse.ok) {
            return handlerResponse;
          }

          let responseData: unknown;
          try {
            responseData = await handlerResponse.clone().json();
          } catch {
            return NextResponse.json(
              { error: "Seller output is not valid JSON" },
              { status: 500 }
            );
          }

          const isValid = validateOutput(responseData);
          if (!isValid) {
            return NextResponse.json(
              {
                error: "Seller output failed schema validation",
                details: validateOutput.errors,
              },
              { status: 500 }
            );
          }

          const remainingCalls = Math.max(0, rental.quotaTotal - rental.quotaUsed);
          const finalHeaders = new Headers(handlerResponse.headers);
          finalHeaders.set("X-PAYMENT-MODE", "RENTAL_LEASE");
          finalHeaders.set("X-RENTAL-QUOTA-USED", String(rental.quotaUsed));
          finalHeaders.set("X-RENTAL-QUOTA-TOTAL", String(rental.quotaTotal));
          finalHeaders.set("X-RENTAL-REMAINING", String(remainingCalls));

          return new NextResponse(JSON.stringify(responseData), {
            status: 200,
            headers: finalHeaders,
          });
        }
      } catch (rentalErr) {
        console.warn("[withPayment] Rental lookup warning:", rentalErr);
      }
    }

    // 1. If no active rental AND no payment signature header, issue 402 challenge
    if (!rawSig) {
      const challenge: PaymentChallenge = {
        x402Version: 2,
        network,
        asset,
        amount: config.price,
        payTo: config.payTo,
        validBefore: Math.floor(Date.now() / 1000) + 3600,
      };

      const b64Challenge = Buffer.from(JSON.stringify(challenge)).toString("base64");
      return new NextResponse(
        JSON.stringify({
          error: "Payment Required",
          challenge,
        }),
        {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "PAYMENT-REQUIRED": b64Challenge,
            "X-PAYMENT-REQUIRED": b64Challenge,
          },
        }
      );
    }

    // 2. Parse signature payload (support both base64 and raw JSON)
    let sigPayload: PaymentSignaturePayload;
    try {
      const decoded = rawSig.startsWith("{")
        ? rawSig
        : Buffer.from(rawSig, "base64").toString("utf-8");
      sigPayload = JSON.parse(decoded);
    } catch {
      return NextResponse.json(
        { error: "Invalid payment signature header encoding" },
        { status: 400 }
      );
    }

    const { authorization, signature } = sigPayload;
    if (!authorization || !signature) {
      return NextResponse.json(
        { error: "Missing authorization or signature in payment header" },
        { status: 400 }
      );
    }

    // Check that payment amount satisfies configured price
    if (authorization.value < config.price) {
      return NextResponse.json(
        {
          error: `Insufficient payment: authorized ${authorization.value}, required ${config.price}`,
        },
        { status: 402 }
      );
    }

    // 3. Verify with Facilitator (Offline cryptographic check + replay prevention)
    const verifyResult = await verifyPayment({
      x402Version: 2,
      network,
      asset,
      amount: config.price,
      payTo: config.payTo,
      authorization,
      signature,
    });

    if (!verifyResult.valid) {
      return NextResponse.json(
        { error: `Payment verification failed: ${verifyResult.error}` },
        { status: 400 }
      );
    }

    // 4. Execute Seller business logic
    let handlerResponse: Response;
    try {
      handlerResponse = await handler(req, context);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Seller execution failure: ${msg}` },
        { status: 500 }
      );
    }

    // If handler returned an error status, do NOT settle payment ("No service, no charge")
    if (!handlerResponse.ok) {
      return handlerResponse;
    }

    // 5. Validate Seller output schema with Ajv
    let responseData: unknown;
    try {
      responseData = await handlerResponse.clone().json();
    } catch {
      return NextResponse.json(
        { error: "Seller output is not valid JSON" },
        { status: 500 }
      );
    }

    const isValid = validateOutput(responseData);
    if (!isValid) {
      return NextResponse.json(
        {
          error: "Seller output failed schema validation",
          details: validateOutput.errors,
        },
        { status: 500 }
      );
    }

    // 6. Settle payment only after output is confirmed valid
    const settleResult = await settlePayment({
      authorization,
      signature,
      network,
    });

    if (!settleResult.settled) {
      // Settlement failed (e.g. buyer double-spent) - withhold payload
      return NextResponse.json(
        { error: `Payment settlement failed: ${settleResult.error}` },
        { status: 502 }
      );
    }

    // 7. Deliver payload with PAYMENT-RESPONSE headers
    const paymentResponsePayload: PaymentResponsePayload = {
      settled: true,
      txHash: settleResult.txHash || "0x",
      network,
    };
    const b64Response = Buffer.from(
      JSON.stringify(paymentResponsePayload)
    ).toString("base64");

    const finalHeaders = new Headers(handlerResponse.headers);
    finalHeaders.set("PAYMENT-RESPONSE", b64Response);
    finalHeaders.set("X-PAYMENT-RESPONSE", b64Response);

    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: finalHeaders,
    });
  };
}
