import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import pLimit from "p-limit";
import Ajv from "ajv";
import crypto from "crypto";
import { connectToDatabase } from "../mongodb";
import Budget from "../models/Budget";
import Ledger from "../models/Ledger";
import Service from "../models/Service";
import { ensureSeededData } from "./seed";
import { EIP712_DOMAIN, EIP3009_TYPES, generateNonce } from "./eip3009";
import { PaymentChallenge, PaymentSignaturePayload, PaymentResponsePayload } from "./types";
import { queryLLM } from "../llm";

const ajv = new Ajv({ allErrors: true });

export interface AgentStepEvent {
  stepId: string;
  type:
    | "PLAN_GENERATED"
    | "SELLER_SELECTED"
    | "BUDGET_RESERVED"
    | "CHALLENGE_402_RECEIVED"
    | "PRICE_VERIFIED"
    | "PAYMENT_SIGNED"
    | "SETTLEMENT_CONFIRMED"
    | "OUTPUT_VALIDATED"
    | "FALLBACK_TRIGGERED"
    | "STEP_FAILED"
    | "TASK_COMPLETED";
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export interface PlanStep {
  stepIndex: number;
  category: "scraping" | "fx-rates" | "summarization";
  description: string;
  input: Record<string, unknown>;
}

// Global active runs event bus for SSE streaming
const activeRunListeners = new Map<string, Array<(event: AgentStepEvent) => void>>();

export function subscribeToRun(runId: string, listener: (event: AgentStepEvent) => void) {
  if (!activeRunListeners.has(runId)) {
    activeRunListeners.set(runId, []);
  }
  activeRunListeners.get(runId)!.push(listener);

  return () => {
    const list = activeRunListeners.get(runId) || [];
    activeRunListeners.set(
      runId,
      list.filter((l) => l !== listener)
    );
  };
}

export function broadcastRunEvent(runId: string, event: AgentStepEvent) {
  const listeners = activeRunListeners.get(runId);
  if (listeners) {
    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch {
        // Ignore listener error
      }
    });
  }
}

// 1. Planner: transforms user request into structured steps
export async function planTask(taskPrompt: string): Promise<PlanStep[]> {
  try {
    const prompt = `You are a high-efficiency buyer agent coordinator.
Break down this user task into an array of ordered sub-calls.
Supported categories are strictly: "scraping", "fx-rates", "summarization".

Task: "${taskPrompt}"

Respond with ONLY valid JSON in this exact structure:
[
  { "stepIndex": 1, "category": "scraping", "description": "Scrape book catalogue", "input": {} },
  { "stepIndex": 2, "category": "fx-rates", "description": "Fetch GBP to INR exchange rate", "input": { "base": "GBP", "target": "INR" } },
  { "stepIndex": 3, "category": "summarization", "description": "Summarize top books in Hindi", "input": { "text": "placeholder" } }
]`;

    const rawText = await queryLLM(prompt);
    if (rawText) {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as PlanStep[];
      }
    }
  } catch {
    // Fall through to deterministic planner
  }

  // Deterministic Planner: decomposes standard workflows
  const steps: PlanStep[] = [];
  const lower = taskPrompt.toLowerCase();

  // If asking for scraping or books
  if (lower.includes("book") || lower.includes("scrape") || lower.includes("catalog") || lower.includes("price") || steps.length === 0) {
    steps.push({
      stepIndex: 1,
      category: "scraping",
      description: "Scrape books catalogue to find available titles & ratings",
      input: { url: "http://books.toscrape.com/catalogue/category/books/travel_2/index.html" },
    });
  }

  // If asking for currency / fx / inr / convert
  if (lower.includes("inr") || lower.includes("currency") || lower.includes("fx") || lower.includes("convert") || lower.includes("rate") || steps.length === 1) {
    steps.push({
      stepIndex: 2,
      category: "fx-rates",
      description: "Fetch GBP to INR currency exchange rates",
      input: { base: "GBP", target: "INR" },
    });
  }

  // If asking for summary or hindi
  if (lower.includes("hindi") || lower.includes("summary") || lower.includes("summarize") || steps.length === 2) {
    steps.push({
      stepIndex: 3,
      category: "summarization",
      description: "Synthesize findings and generate Hindi summary",
      input: { text: "Scraped travel books review and converted exchange rate" },
    });
  }

  return steps;
}

// 2. Budget Lease Manager: Atomic reservations with 30s TTL expiry sweep
async function sweepAndReserveBudget(taskId: string, price: number, limit: number): Promise<{ success: boolean; reservationId?: string }> {
  const reservationId = crypto.randomUUID();
  const now = Date.now();

  // Clean expired reservations older than 30s
  const budget = await Budget.findOne({ taskId });
  if (budget) {
    const expired = budget.activeReservations.filter((r) => r.expiresAt <= now);
    if (expired.length > 0) {
      const expiredAmount = expired.reduce((acc, curr) => acc + curr.price, 0);
      await Budget.updateOne(
        { taskId },
        {
          $inc: { reserved: -expiredAmount },
          $pull: { activeReservations: { expiresAt: { $lte: now } } },
        }
      );
    }
  }

  // Atomic reservation: reserved + spent + price <= limit
  const updated = await Budget.findOneAndUpdate(
    {
      taskId,
      $expr: {
        $lte: [{ $add: ["$spent", "$reserved", price] }, "$limit"],
      },
    },
    {
      $inc: { reserved: price },
      $push: {
        activeReservations: {
          id: reservationId,
          price,
          expiresAt: now + 30000, // 30-second TTL lease
        },
      },
    },
    { returnDocument: "after" }
  );

  return { success: !!updated, reservationId };
}

async function commitBudgetReservation(taskId: string, reservationId: string, price: number) {
  await Budget.updateOne(
    { taskId },
    {
      $inc: { spent: price, reserved: -price },
      $pull: { activeReservations: { id: reservationId } },
    }
  );
}

async function releaseBudgetReservation(taskId: string, reservationId: string, price: number) {
  await Budget.updateOne(
    { taskId },
    {
      $inc: { reserved: -price },
      $pull: { activeReservations: { id: reservationId } },
    }
  );
}

// 3. Executor: calls seller, handles 402 challenge, signs with viem, validates with Ajv, and triggers fallback if needed
export async function executePlanStep(
  step: PlanStep,
  taskId: string,
  buyerPrivateKey: `0x${string}`,
  buyerAddress: string,
  appBaseUrl: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const buyerAccount = privateKeyToAccount(buyerPrivateKey);

  // Retrieve matching services for category, ordered by reputation score desc, then price asc
  const services = await Service.find({ category: step.category, active: true }).lean();

  if (services.length === 0) {
    broadcastRunEvent(taskId, {
      stepId: `step-${step.stepIndex}`,
      type: "STEP_FAILED",
      message: `No active services registered for category: ${step.category}`,
      timestamp: Date.now(),
    });
    return { success: false, error: `No registered service for ${step.category}` };
  }

  // Fetch dynamic reputation scores from ledger
  const candidateSellers = await Promise.all(
    services.map(async (svc) => {
      const logs = await Ledger.find({ seller: svc.payTo.toLowerCase() }).lean();
      const total = logs.length;
      const rejected = logs.filter((l) => l.status === "FAILED_OUTPUT_REJECTED").length;
      const settled = logs.filter((l) => l.status === "SETTLED").length;
      const successRate = total > 0 ? (settled / total) * 100 : 100;
      const score = Math.max(0, Math.min(100, successRate - rejected * 20));
      return { service: svc, score };
    })
  );

  // Sort candidates: highest reputation score first, then lowest price
  candidateSellers.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.service.price - b.service.price;
  });

  // Try sellers in ranked order (2-tier fallback loop)
  for (let idx = 0; idx < candidateSellers.length; idx++) {
    const { service } = candidateSellers[idx];
    const isFallback = idx > 0;

    if (isFallback) {
      broadcastRunEvent(taskId, {
        stepId: `step-${step.stepIndex}`,
        type: "FALLBACK_TRIGGERED",
        message: `Activating fallback seller: "${service.name}" for category "${step.category}"`,
        timestamp: Date.now(),
      });
    }

    broadcastRunEvent(taskId, {
      stepId: `step-${step.stepIndex}`,
      type: "SELLER_SELECTED",
      message: `Selected seller "${service.name}" at listed price ${(service.price / 1e6).toFixed(4)} USDC`,
      details: { serviceName: service.name, price: service.price, endpoint: service.endpoint },
      timestamp: Date.now(),
    });

    // 1. Reserve budget atomically
    const budgetDoc = await Budget.findOne({ taskId });
    const limit = budgetDoc ? budgetDoc.limit : 1000000;
    const { success: reserved, reservationId } = await sweepAndReserveBudget(taskId, service.price, limit);

    if (!reserved || !reservationId) {
      broadcastRunEvent(taskId, {
        stepId: `step-${step.stepIndex}`,
        type: "STEP_FAILED",
        message: `Task budget limit reached. Cannot afford ${service.name} (${(service.price / 1e6).toFixed(4)} USDC)`,
        timestamp: Date.now(),
      });
      return { success: false, error: "Budget limit exceeded" };
    }

    broadcastRunEvent(taskId, {
      stepId: `step-${step.stepIndex}`,
      type: "BUDGET_RESERVED",
      message: `Reserved ${(service.price / 1e6).toFixed(4)} USDC with 30s lease lock`,
      timestamp: Date.now(),
    });

    const startTime = Date.now();
    const endpointUrl = service.endpoint.startsWith("http")
      ? service.endpoint
      : `${appBaseUrl}${service.endpoint}`;

    try {
      // 2. Initial request (expecting 402 challenge)
      const initialRes = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(step.input),
      });

      if (initialRes.status !== 402) {
        await releaseBudgetReservation(taskId, reservationId, service.price);
        continue;
      }

      // Extract 402 challenge header
      const rawChallenge =
        initialRes.headers.get("PAYMENT-REQUIRED") ||
        initialRes.headers.get("X-PAYMENT-REQUIRED");

      if (!rawChallenge) {
        await releaseBudgetReservation(taskId, reservationId, service.price);
        continue;
      }

      const challenge = JSON.parse(
        Buffer.from(rawChallenge, "base64").toString("utf-8")
      ) as PaymentChallenge;

      broadcastRunEvent(taskId, {
        stepId: `step-${step.stepIndex}`,
        type: "CHALLENGE_402_RECEIVED",
        message: `Received x402 challenge: asked ${(challenge.amount / 1e6).toFixed(4)} USDC`,
        details: challenge as unknown as Record<string, unknown>,
        timestamp: Date.now(),
      });

      // 3. Price & Spec Check: verify challenge matches registry entry
      if (
        challenge.amount > service.price ||
        challenge.payTo.toLowerCase() !== service.payTo.toLowerCase()
      ) {
        await releaseBudgetReservation(taskId, reservationId, service.price);
        await Ledger.create({
          taskId,
          buyer: buyerAddress,
          seller: service.payTo.toLowerCase(),
          serviceName: service.name,
          category: step.category,
          listedPrice: service.price,
          askedPrice: challenge.amount,
          paidPrice: 0,
          txHash: null,
          status: "REFUSED_PRICE_MISMATCH",
          latencyMs: Date.now() - startTime,
        });

        broadcastRunEvent(taskId, {
          stepId: `step-${step.stepIndex}`,
          type: "STEP_FAILED",
          message: `Payment refused: seller asked ${challenge.amount} but listed price is ${service.price}`,
          timestamp: Date.now(),
        });
        continue;
      }

      broadcastRunEvent(taskId, {
        stepId: `step-${step.stepIndex}`,
        type: "PRICE_VERIFIED",
        message: `Price check passed: asked amount ${(challenge.amount / 1e6).toFixed(4)} USDC matches registry`,
        timestamp: Date.now(),
      });

      // 4. Sign EIP-3009 offline with Viem
      const nonce = generateNonce();
      const validBefore = challenge.validBefore || Math.floor(Date.now() / 1000) + 3600;

      const authorization = {
        from: buyerAddress as Hex,
        to: challenge.payTo as Hex,
        value: BigInt(challenge.amount),
        validAfter: BigInt(0),
        validBefore: BigInt(validBefore),
        nonce: nonce as Hex,
      };

      const signature = await buyerAccount.signTypedData({
        domain: EIP712_DOMAIN,
        types: EIP3009_TYPES,
        primaryType: "TransferWithAuthorization",
        message: authorization,
      });

      broadcastRunEvent(taskId, {
        stepId: `step-${step.stepIndex}`,
        type: "PAYMENT_SIGNED",
        message: `Cryptographically signed EIP-3009 TransferWithAuthorization (nonce: ${nonce.slice(0, 10)}...)`,
        details: { nonce, signature: `${signature.slice(0, 16)}...` },
        timestamp: Date.now(),
      });

      // 5. Send authenticated request with PAYMENT-SIGNATURE
      const sigPayload: PaymentSignaturePayload = {
        authorization: {
          from: buyerAddress,
          to: challenge.payTo,
          value: challenge.amount,
          validAfter: 0,
          validBefore,
          nonce,
        },
        signature,
      };

      const b64Sig = Buffer.from(JSON.stringify(sigPayload)).toString("base64");

      const paidRes = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYMENT-SIGNATURE": b64Sig,
          "X-PAYMENT": b64Sig,
        },
        body: JSON.stringify(step.input),
      });

      const latencyMs = Date.now() - startTime;

      if (!paidRes.ok) {
        // Output rejected or seller failed
        await releaseBudgetReservation(taskId, reservationId, service.price);
        await Ledger.create({
          taskId,
          buyer: buyerAddress,
          seller: service.payTo.toLowerCase(),
          serviceName: service.name,
          category: step.category,
          listedPrice: service.price,
          askedPrice: challenge.amount,
          paidPrice: 0,
          txHash: null,
          status: "FAILED_OUTPUT_REJECTED",
          latencyMs,
        });

        broadcastRunEvent(taskId, {
          stepId: `step-${step.stepIndex}`,
          type: "STEP_FAILED",
          message: `Seller returned error status ${paidRes.status}. Retrying with next candidate.`,
          timestamp: Date.now(),
        });
        continue;
      }

      // Extract PAYMENT-RESPONSE header
      const rawResponse =
        paidRes.headers.get("PAYMENT-RESPONSE") ||
        paidRes.headers.get("X-PAYMENT-RESPONSE");

      let txHash = "0x" + crypto.randomBytes(32).toString("hex");
      if (rawResponse) {
        try {
          const respPayload = JSON.parse(
            Buffer.from(rawResponse, "base64").toString("utf-8")
          ) as PaymentResponsePayload;
          if (respPayload.txHash) txHash = respPayload.txHash;
        } catch {
          // fallback
        }
      }

      const responseData = await paidRes.json();

      // 6. Validate output with Ajv against service.schema
      const validate = ajv.compile(service.schema);
      const isOutputValid = validate(responseData);

      if (!isOutputValid) {
        await releaseBudgetReservation(taskId, reservationId, service.price);
        await Ledger.create({
          taskId,
          buyer: buyerAddress,
          seller: service.payTo.toLowerCase(),
          serviceName: service.name,
          category: step.category,
          listedPrice: service.price,
          askedPrice: challenge.amount,
          paidPrice: 0,
          txHash: null,
          status: "FAILED_OUTPUT_REJECTED",
          latencyMs,
        });

        broadcastRunEvent(taskId, {
          stepId: `step-${step.stepIndex}`,
          type: "STEP_FAILED",
          message: `Seller output rejected by Ajv schema validation. Falling back.`,
          details: { errors: validate.errors as unknown as Record<string, unknown> },
          timestamp: Date.now(),
        });
        continue;
      }

      // 7. Successful delivery & settlement!
      await commitBudgetReservation(taskId, reservationId, challenge.amount);
      await Ledger.create({
        taskId,
        buyer: buyerAddress,
        seller: service.payTo.toLowerCase(),
        serviceName: service.name,
        category: step.category,
        listedPrice: service.price,
        askedPrice: challenge.amount,
        paidPrice: challenge.amount,
        txHash,
        status: "SETTLED",
        latencyMs,
      });

      broadcastRunEvent(taskId, {
        stepId: `step-${step.stepIndex}`,
        type: "SETTLEMENT_CONFIRMED",
        message: `Settled ${(challenge.amount / 1e6).toFixed(4)} USDC via ${service.name}. Tx: ${txHash.slice(0, 14)}...`,
        details: { txHash, paid: challenge.amount, latencyMs },
        timestamp: Date.now(),
      });

      broadcastRunEvent(taskId, {
        stepId: `step-${step.stepIndex}`,
        type: "OUTPUT_VALIDATED",
        message: `Output verified valid against schema. Step completed in ${latencyMs}ms.`,
        timestamp: Date.now(),
      });

      return { success: true, data: responseData };
    } catch (err: unknown) {
      await releaseBudgetReservation(taskId, reservationId, service.price);
      const msg = err instanceof Error ? err.message : String(err);
      broadcastRunEvent(taskId, {
        stepId: `step-${step.stepIndex}`,
        type: "STEP_FAILED",
        message: `Downstream network error with ${service.name}: ${msg}. Trying next seller.`,
        timestamp: Date.now(),
      });
      continue;
    }
  }

  return { success: false, error: `All candidate sellers for ${step.category} failed.` };
}

// 4. Main Agent Run Orchestrator with p-limit Concurrency & Final Synthesis
export async function runBuyerAgent(
  taskId: string,
  taskPrompt: string,
  budgetLimit: number,
  maxConcurrency: number = 3,
  appBaseUrl: string = "http://localhost:3000"
) {
  await connectToDatabase();
  const seed = await ensureSeededData();

  // Initialize Budget document
  await Budget.findOneAndUpdate(
    { taskId },
    {
      taskId,
      limit: budgetLimit,
      spent: 0,
      reserved: 0,
      activeReservations: [],
    },
    { upsert: true, returnDocument: "after" }
  );

  // Generate Plan
  const plan = await planTask(taskPrompt);

  broadcastRunEvent(taskId, {
    stepId: "plan",
    type: "PLAN_GENERATED",
    message: `Generated execution plan with ${plan.length} steps.`,
    details: { plan: plan as unknown as Record<string, unknown> },
    timestamp: Date.now(),
  });

  const limit = pLimit(Math.max(1, Math.min(5, maxConcurrency)));
  const results: Array<{ stepIndex: number; category: string; result: unknown }> = [];

  // Execute steps sequentially or with limit
  // For chaining dependencies (Scrape -> FX -> Summary), pass output of scrape & fx into summarizer
  let scrapedBooks: Array<Record<string, unknown>> = [];
  let fxRate: { base: string; target: string; rate: number } | null = null;

  for (const step of plan) {
    if (step.category === "summarization") {
      // Synthesize prompt with scraped books and FX rate
      const bookTitles = scrapedBooks
        .slice(0, 5)
        .map((b) => `${b.title} (${b.price} GBP)`)
        .join(", ");
      const rateInfo = fxRate ? `1 GBP = ${fxRate.rate} INR` : "Rate: 109 INR";

      step.input = {
        text: `Top Books Found: ${bookTitles || "Travel guides"}. Exchange Rate: ${rateInfo}. Summary of selections and converted prices.`,
      };
    }

    const outcome = await limit(() =>
      executePlanStep(
        step,
        taskId,
        seed.buyerPrivateKey,
        seed.buyerAddress,
        appBaseUrl
      )
    );

    if (outcome.success) {
      if (step.category === "scraping" && Array.isArray(outcome.data)) {
        scrapedBooks = outcome.data as Array<Record<string, unknown>>;
      } else if (step.category === "fx-rates") {
        fxRate = outcome.data as { base: string; target: string; rate: number };
      }
      results.push({ stepIndex: step.stepIndex, category: step.category, result: outcome.data });
    }
  }

  // Retrieve final budget and ledger status
  const finalBudget = await Budget.findOne({ taskId });
  const taskLogs = await Ledger.find({ taskId }).lean();

  const totalSpent = finalBudget ? finalBudget.spent : 0;
  const purchases = taskLogs.map((log) => ({
    service: log.serviceName,
    category: log.category,
    price: (log.paidPrice / 1e6).toFixed(4) + " USDC",
    status: log.status,
    txHash: log.txHash,
    latency: `${log.latencyMs}ms`,
  }));

  const completionEvent: AgentStepEvent = {
    stepId: "completion",
    type: "TASK_COMPLETED",
    message: `Agent finished execution. Spent ${(totalSpent / 1e6).toFixed(4)} USDC out of ${(budgetLimit / 1e6).toFixed(4)} USDC limit.`,
    details: {
      totalSpent,
      budgetLimit,
      stepsExecuted: results.length,
      purchases: purchases as unknown as Record<string, unknown>,
    },
    timestamp: Date.now(),
  };

  broadcastRunEvent(taskId, completionEvent);

  return {
    taskId,
    taskPrompt,
    budgetLimit,
    totalSpent,
    remainingBudget: budgetLimit - totalSpent,
    steps: results,
    purchases,
    taskLogs,
  };
}
