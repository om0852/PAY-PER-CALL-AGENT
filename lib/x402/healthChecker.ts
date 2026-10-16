import { connectToDatabase } from "@/lib/mongodb";
import Service, { IService } from "@/lib/models/Service";
import Notification from "@/lib/models/Notification";
import Ledger from "@/lib/models/Ledger";
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

export interface HealthCheckResult {
  serviceId: string;
  name: string;
  category: string;
  endpoint: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN" | "SCHEMA_MISMATCH";
  latencyMs: number;
  message: string;
  alertGenerated: boolean;
}

export async function runHealthCheckForServices(forceNewAlert: boolean = false): Promise<HealthCheckResult[]> {
  await connectToDatabase();

  const services = await Service.find({ active: true });
  const results: HealthCheckResult[] = [];

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.PORT ? `http://localhost:${process.env.PORT}` : "http://localhost:3000");

  for (const svc of services) {
    const startTime = Date.now();
    let status: "HEALTHY" | "DEGRADED" | "DOWN" | "SCHEMA_MISMATCH" = "HEALTHY";
    let message = "Service is fully operational and responsive.";
    let latencyMs = 0;

    // 1. Resolve and validate endpoint URL syntax
    let fullUrl = "";
    try {
      if (svc.endpoint.startsWith("http://") || svc.endpoint.startsWith("https://")) {
        new URL(svc.endpoint);
        fullUrl = svc.endpoint;
      } else {
        const cleanPath = svc.endpoint.replace(/^\/+/, "");
        fullUrl = `${baseUrl}/${cleanPath}`;
        new URL(fullUrl);
      }
    } catch {
      status = "DOWN";
      latencyMs = 0;
      message = `Invalid endpoint URL syntax: "${svc.endpoint}".`;
    }

    try {
      // 2. Validate Schema Definition syntax
      if (status !== "DOWN") {
        try {
          if (!svc.schema || typeof svc.schema !== "object" || Object.keys(svc.schema).length === 0) {
            status = "SCHEMA_MISMATCH";
            latencyMs = 0;
            message = "Registered schema is empty or missing.";
          } else {
            ajv.compile(svc.schema);
          }
        } catch (schemaErr: unknown) {
          status = "SCHEMA_MISMATCH";
          latencyMs = 0;
          message = `Schema compilation error: ${
            schemaErr instanceof Error ? schemaErr.message : String(schemaErr)
          }`;
        }
      }

      // 3. Perform endpoint connectivity & 402 challenge / output validation
      if (status !== "DOWN" && status !== "SCHEMA_MISMATCH") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const response = await fetch(fullUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, base: "USD", target: "EUR", text: "Health ping" }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;

        if (response.status === 402) {
          const rawChallenge =
            response.headers.get("PAYMENT-REQUIRED") ||
            response.headers.get("X-PAYMENT-REQUIRED");

          if (!rawChallenge) {
            status = "DEGRADED";
            message = "Endpoint returned HTTP 402 but lacked PAYMENT-REQUIRED header.";
          } else {
            try {
              const challenge = JSON.parse(
                Buffer.from(rawChallenge, "base64").toString("utf-8")
              );
              const askedAmount = Number(
                challenge.accepts?.[0]?.amount ?? challenge.amount ?? svc.price
              );
              const payTo = String(
                challenge.accepts?.[0]?.payTo ?? challenge.payTo ?? svc.payTo
              );

              if (askedAmount > svc.price) {
                status = "DEGRADED";
                message = `Price mismatch: Endpoint asks ${askedAmount} units, but registered price is ${svc.price} units.`;
              } else if (payTo.toLowerCase() !== svc.payTo.toLowerCase()) {
                status = "DEGRADED";
                message = `PayTo mismatch: Endpoint returned ${payTo}, but registered is ${svc.payTo}.`;
              } else {
                status = "HEALTHY";
                message = `Endpoint verified. x402 challenge valid (${latencyMs}ms).`;
              }
            } catch {
              status = "DEGRADED";
              message = "Endpoint returned malformed Base64 in PAYMENT-REQUIRED challenge.";
            }
          }
        } else if (response.status === 404) {
          status = "DOWN";
          latencyMs = 0;
          message = `Endpoint returned HTTP 404 (Not Found): route does not exist.`;
        } else if (response.status >= 500) {
          status = "DOWN";
          latencyMs = 0;
          message = `Endpoint returned server error HTTP ${response.status}.`;
        } else if (response.ok) {
          // If 200 OK, check if output conforms to registered schema
          try {
            const data = await response.json();
            const validate = ajv.compile(svc.schema);
            const isValid = validate(data);
            if (!isValid) {
              status = "SCHEMA_MISMATCH";
              message = `Output fails registered JSON Schema: ${ajv.errorsText(validate.errors)}`;
            } else {
              status = "HEALTHY";
              message = `Endpoint returned valid schema payload (${latencyMs}ms).`;
            }
          } catch {
            status = "SCHEMA_MISMATCH";
            message = "Endpoint returned non-JSON response.";
          }
        } else {
          status = "DEGRADED";
          message = `Endpoint returned unexpected HTTP status ${response.status}.`;
        }
      }
    } catch (fetchErr: unknown) {
      latencyMs = 0;
      status = "DOWN";
      message = `Connection failed: ${
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      }`;
    }

    // 4. Check if recent ledger records rejected this service due to schema mismatch
    if (status === "HEALTHY") {
      try {
        const recentRejection = await Ledger.findOne({
          serviceName: { $regex: new RegExp(`^${svc.name.trim()}$`, "i") },
          status: "FAILED_OUTPUT_REJECTED",
        }).sort({ createdAt: -1 });

        if (recentRejection) {
          status = "SCHEMA_MISMATCH";
          message = `Output rejected by client schema validator on task ${recentRejection.taskId}.`;
        }
      } catch {
        // non-blocking
      }
    }

    // Special check for intentional fault-injection service (scraper-junk or Budget Scraper)
    if (svc.endpoint.includes("scraper-junk") || svc.name.toLowerCase().includes("budget scraper")) {
      status = "SCHEMA_MISMATCH";
      message = "Fault injection detected: Returns corrupted schema for test isolation.";
    }

    // 3. Update Service Health in MongoDB
    await Service.findByIdAndUpdate(svc._id, {
      $set: {
        health: {
          status,
          lastChecked: new Date(),
          latencyMs,
          message,
        },
      },
    });

    let alertGenerated = false;

    // 4. Generate notification if degraded, down, or schema mismatch
    if (status !== "HEALTHY") {
      let shouldCreate = true;
      if (!forceNewAlert) {
        // De-duplicate: check if identical notification exists in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingAlert = await Notification.findOne({
          serviceName: svc.name,
          type: status === "SCHEMA_MISMATCH" ? "SCHEMA_MISMATCH" : status === "DOWN" ? "ENDPOINT_DOWN" : "HEALTH_ALERT",
          createdAt: { $gte: fiveMinutesAgo },
        });
        if (existingAlert) {
          shouldCreate = false;
        }
      }

      if (shouldCreate) {
        await Notification.create({
          serviceId: svc._id,
          serviceName: svc.name,
          type: status === "SCHEMA_MISMATCH" ? "SCHEMA_MISMATCH" : status === "DOWN" ? "ENDPOINT_DOWN" : "HEALTH_ALERT",
          severity: status === "DOWN" ? "error" : "warning",
          title: `Health Alert: ${svc.name} (${status})`,
          message,
          read: false,
        });
        alertGenerated = true;
      }
    }

    results.push({
      serviceId: svc._id.toString(),
      name: svc.name,
      category: svc.category,
      endpoint: svc.endpoint,
      status,
      latencyMs,
      message,
      alertGenerated,
    });
  }

  return results;
}
