"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileCode,
  ShieldCheck,
  Copy,
  Check,
  Play,
  Send,
  Terminal,
  Activity,
  Zap,
  Globe,
  Bell,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Code,
  Cpu,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface DeveloperHubProps {
  triggerToast: (msg: string) => void;
}

export default function DeveloperHub({ triggerToast }: DeveloperHubProps) {
  const [activeTab, setActiveTab] = useState<"console" | "webhooks" | "tooling" | "specs">("console");

  // Console State
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("buyer-run");
  const [selectedLang, setSelectedLang] = useState<"curl" | "ts" | "python" | "node">("curl");
  const [consolePayload, setConsolePayload] = useState<string>(
    JSON.stringify(
      {
        task: "Convert XML customer reviews to JSON and classify sentiment",
        budget: 200000,
        maxConcurrency: 3,
      },
      null,
      2
    )
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Webhooks State
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookDesc, setNewWebhookDesc] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([
    "settlement.completed",
    "balance.low",
    "task.failed",
  ]);
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Webhook Test Ping State
  const [testWebhookUrl, setTestWebhookUrl] = useState("https://api.merchant.io/v1/x402-webhooks");
  const [testWebhookEvent, setTestWebhookEvent] = useState("settlement.completed");
  const [isPinging, setIsPinging] = useState(false);
  const [testPingResult, setTestPingResult] = useState<any>(null);

  // Load registered webhooks
  const loadWebhooks = useCallback(async () => {
    try {
      setLoadingWebhooks(true);
      const res = await fetch("/api/developer/webhooks");
      if (res.ok) {
        const json = await res.json();
        setWebhooks(json.webhooks || []);
        if (json.webhooks && json.webhooks.length > 0 && !testWebhookUrl) {
          setTestWebhookUrl(json.webhooks[0].url);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingWebhooks(false);
    }
  }, [testWebhookUrl]);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  // Update default payload when endpoint changes
  const handleEndpointChange = (ep: string) => {
    setSelectedEndpoint(ep);
    setExecutionResult(null);
    if (ep === "buyer-run") {
      setConsolePayload(
        JSON.stringify(
          {
            task: "Convert XML customer reviews to JSON and classify sentiment",
            budget: 200000,
            maxConcurrency: 3,
          },
          null,
          2
        )
      );
    } else if (ep === "xml-to-json") {
      setConsolePayload(
        JSON.stringify(
          {
            xml: '<order id="102"><customer>Satoshi</customer><items><item name="Hardware Key" price="79.99" /><item name="Backup Seed" price="19.99" /></items><status>Confirmed</status></order>',
          },
          null,
          2
        )
      );
    } else if (ep === "sentiment") {
      setConsolePayload(
        JSON.stringify(
          {
            text: "Base Sepolia L2 gasless micro-settlements are extraordinarily fast, dependable, and 100% free of gas fees!",
          },
          null,
          2
        )
      );
    } else {
      setConsolePayload("");
    }
  };

  // Execute console call
  const handleExecuteCall = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    const startTime = Date.now();

    try {
      let url = "/api/buyer/run";
      let method = "POST";
      let body: any = null;

      if (selectedEndpoint === "buyer-run") {
        url = "/api/buyer/run";
        body = consolePayload ? JSON.parse(consolePayload) : {};
      } else if (selectedEndpoint === "xml-to-json") {
        url = "/api/sellers/xml-to-json";
        body = consolePayload ? JSON.parse(consolePayload) : {};
      } else if (selectedEndpoint === "sentiment") {
        url = "/api/sellers/sentiment-categorizer";
        body = consolePayload ? JSON.parse(consolePayload) : {};
      } else if (selectedEndpoint === "services") {
        url = "/api/registry/services";
        method = "GET";
      } else if (selectedEndpoint === "wallets") {
        url = "/api/wallets";
        method = "GET";
      } else if (selectedEndpoint === "ledger") {
        url = "/api/ledger";
        method = "GET";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const latencyMs = Date.now() - startTime;
      const paymentHeader = res.headers.get("payment-required") || res.headers.get("x-payment-required");

      const bodyText = await res.text();
      let bodyJson: any;
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {
        bodyJson = bodyText;
      }

      setExecutionResult({
        status: res.status,
        statusText: res.statusText || (res.status === 402 ? "Payment Required" : "OK"),
        latencyMs,
        headers: {
          "content-type": res.headers.get("content-type"),
          "payment-required": paymentHeader ? `${paymentHeader.slice(0, 32)}... (Base64 EIP-3009 Challenge)` : null,
        },
        body: bodyJson,
      });

      triggerToast(`Request completed: HTTP ${res.status} in ${latencyMs}ms`);
    } catch (err: any) {
      setExecutionResult({
        status: 500,
        statusText: "Error",
        latencyMs: Date.now() - startTime,
        error: err.message,
      });
      triggerToast("Request failed: " + err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // Register Webhook
  const handleRegisterWebhook = async () => {
    if (!newWebhookUrl.trim() || !newWebhookUrl.startsWith("http")) {
      triggerToast("Please enter a valid HTTP or HTTPS webhook URL");
      return;
    }

    try {
      setIsRegisteringWebhook(true);
      const res = await fetch("/api/developer/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newWebhookUrl.trim(),
          description: newWebhookDesc.trim(),
          events: newWebhookEvents,
        }),
      });

      const json = await res.json();
      if (json.success) {
        triggerToast("Webhook endpoint registered successfully!");
        setNewWebhookUrl("");
        setNewWebhookDesc("");
        loadWebhooks();
      } else {
        triggerToast("Failed: " + json.error);
      }
    } catch (err: any) {
      triggerToast("Error: " + err.message);
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async (id: string) => {
    try {
      const res = await fetch(`/api/developer/webhooks?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        triggerToast("Webhook deleted");
        loadWebhooks();
      }
    } catch {
      triggerToast("Failed to delete webhook");
    }
  };

  // Dispatch Test Ping
  const handleTestPing = async () => {
    if (!testWebhookUrl.trim()) {
      triggerToast("Please enter a target webhook URL");
      return;
    }

    try {
      setIsPinging(true);
      setTestPingResult(null);

      const res = await fetch("/api/developer/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: testWebhookUrl.trim(),
          eventType: testWebhookEvent,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setTestPingResult(json.delivery);
        triggerToast(`Ping sent! HTTP ${json.delivery?.statusCode} in ${json.delivery?.latencyMs}ms`);
        loadWebhooks();
      } else {
        triggerToast("Ping failed: " + json.error);
      }
    } catch (err: any) {
      triggerToast("Error sending ping: " + err.message);
    } finally {
      setIsPinging(false);
    }
  };

  // Generate code snippet
  const getCodeSnippet = () => {
    const isPost = ["buyer-run", "xml-to-json", "sentiment"].includes(selectedEndpoint);
    const endpointPath =
      selectedEndpoint === "buyer-run"
        ? "/api/buyer/run"
        : selectedEndpoint === "xml-to-json"
        ? "/api/sellers/xml-to-json"
        : selectedEndpoint === "sentiment"
        ? "/api/sellers/sentiment-categorizer"
        : selectedEndpoint === "services"
        ? "/api/registry/services"
        : selectedEndpoint === "wallets"
        ? "/api/wallets"
        : "/api/ledger";

    if (selectedLang === "curl") {
      if (isPost) {
        return `curl -X POST "http://localhost:3000${endpointPath}" \\
  -H "Content-Type: application/json" \\
  -d '${consolePayload.replace(/\n/g, "").replace(/\s+/g, " ")}'`;
      }
      return `curl -X GET "http://localhost:3000${endpointPath}"`;
    }

    if (selectedLang === "ts") {
      if (selectedEndpoint === "buyer-run") {
        return `import { AgentBucketClient } from "@agentbucket/sdk";

const client = new AgentBucketClient({ baseUrl: "http://localhost:3000" });

const run = await client.agent.run({
  task: "Convert XML customer reviews to JSON and classify sentiment",
  budgetUsdc: 0.20
});

console.log("Task ID:", run.taskId);
console.log("Verified Purchases:", run.steps);`;
      }
      return `import { AgentBucketClient } from "@agentbucket/sdk";

const client = new AgentBucketClient();
const res = await client.callService("${endpointPath}", ${isPost ? consolePayload : "{}"});

console.log("Status:", res.status);
console.log("Data:", res.data);`;
    }

    if (selectedLang === "python") {
      if (isPost) {
        return `import requests

res = requests.post(
    "http://localhost:3000${endpointPath}",
    headers={"Content-Type": "application/json"},
    json=${consolePayload}
)

print("Status Code:", res.status_code)
print("Response:", res.json())`;
      }
      return `import requests

res = requests.get("http://localhost:3000${endpointPath}")
print(res.json())`;
    }

    // Node.js fetch
    return `const res = await fetch("http://localhost:3000${endpointPath}", {
  method: "${isPost ? "POST" : "GET"}",
  headers: { "Content-Type": "application/json" }${isPost ? `,\n  body: JSON.stringify(${consolePayload})` : ""}
});

const data = await res.json();
console.log(data);`;
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#d4af37]/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#735c00]">
              Developer Gateway &amp; Integration Hub
            </span>
            <span className="text-[#5b5e66]">•</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gateway Online (Base Sepolia L2)
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#1b1c1a] tracking-tight">
            Developer API Gateway &amp; Webhook Documentation
          </h2>
          <p className="text-xs text-[#5b5e66] mt-1 max-w-3xl">
            Programmatically query services, execute gasless autonomous buyer workflows, receive signed webhook events,
            and interface AI IDEs via Model Context Protocol (MCP), CLI, and SDK.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-[#f5f3f0] px-3.5 py-2 rounded-xl border border-[#d0c5af]/50 font-mono text-xs flex items-center gap-2">
            <span className="text-[#5b5e66]">Base URL:</span>
            <span className="text-[#1b1c1a] font-semibold">http://localhost:3000</span>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#efeeeb] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("console")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "console"
              ? "bg-[#1b1c1a] text-white shadow-sm"
              : "bg-white text-[#5b5e66] hover:bg-[#f5f3f0] border border-[#efeeeb]"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Interactive API Console</span>
        </button>

        <button
          onClick={() => setActiveTab("webhooks")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === "webhooks"
              ? "bg-[#1b1c1a] text-white shadow-sm"
              : "bg-white text-[#5b5e66] hover:bg-[#f5f3f0] border border-[#efeeeb]"
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-amber-500" />
          <span>Webhooks &amp; Event Dispatcher</span>
          {webhooks.length > 0 && (
            <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1">
              {webhooks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("tooling")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "tooling"
              ? "bg-[#1b1c1a] text-white shadow-sm"
              : "bg-white text-[#5b5e66] hover:bg-[#f5f3f0] border border-[#efeeeb]"
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-blue-500" />
          <span>AI Agents, MCP &amp; CLI Tooling</span>
        </button>

        <button
          onClick={() => setActiveTab("specs")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "specs"
              ? "bg-[#1b1c1a] text-white shadow-sm"
              : "bg-white text-[#5b5e66] hover:bg-[#f5f3f0] border border-[#efeeeb]"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>EIP-3009 Gasless Protocol Specs</span>
        </button>
      </div>

      {/* 3. TAB 1: INTERACTIVE API CONSOLE */}
      {activeTab === "console" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Request Configuration */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#efeeeb] shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1b1c1a] uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-[#735c00]" />
                  Endpoint Selector
                </span>
                <span className="text-[10px] font-mono text-[#5b5e66]">HTTP 402 Guarded</span>
              </div>

              {/* Endpoint selection grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: "buyer-run", label: "POST /api/buyer/run", desc: "Autonomous AI Agent Runner" },
                  { id: "xml-to-json", label: "POST /api/sellers/xml-to-json", desc: "XML to JSON Converter ($0.03)" },
                  { id: "sentiment", label: "POST /api/sellers/sentiment-categorizer", desc: "Sentiment AI ($0.035)" },
                  { id: "services", label: "GET /api/registry/services", desc: "Active Marketplace Catalog" },
                  { id: "wallets", label: "GET /api/wallets", desc: "Participant Matrix & Balances" },
                  { id: "ledger", label: "GET /api/ledger", desc: "Micro-Settlement Ledger" },
                ].map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => handleEndpointChange(ep.id)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      selectedEndpoint === ep.id
                        ? "bg-amber-50/60 border-[#d4af37] ring-1 ring-[#d4af37]"
                        : "bg-[#fbfbf9] border-[#efeeeb] hover:bg-[#f5f3f0]"
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-[#1b1c1a] block truncate">{ep.label}</span>
                    <span className="text-[10px] text-[#5b5e66] block mt-0.5">{ep.desc}</span>
                  </button>
                ))}
              </div>

              {/* Payload editor if POST */}
              {["buyer-run", "xml-to-json", "sentiment"].includes(selectedEndpoint) && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-[#1b1c1a]">JSON Request Body</span>
                    <span className="text-[10px] text-[#8c8f94] font-mono">application/json</span>
                  </div>
                  <textarea
                    rows={6}
                    value={consolePayload}
                    onChange={(e) => setConsolePayload(e.target.value)}
                    className="w-full bg-[#1b1c1a] text-amber-300 font-mono text-xs p-3.5 rounded-xl border border-[#30363d] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
              )}

              {/* Language selection & Execute button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#efeeeb]">
                <div className="flex items-center gap-1 bg-[#f5f3f0] p-1 rounded-lg border border-[#e5e7eb]">
                  {(["curl", "ts", "python", "node"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLang(lang)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        selectedLang === lang ? "bg-white text-[#1b1c1a] shadow-sm font-bold" : "text-[#5b5e66]"
                      }`}
                    >
                      {lang === "curl" ? "cURL" : lang === "ts" ? "TypeScript" : lang === "python" ? "Python" : "Node.js"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleExecuteCall}
                  disabled={isExecuting}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#d4af37] hover:brightness-105 text-[#554300] font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>⚡ Test Run in Console</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="bg-[#1b1c1a] rounded-2xl p-5 border border-[#30363d] shadow-sm text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-[#d4af37]" />
                  Client Implementation ({selectedLang.toUpperCase()})
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getCodeSnippet());
                    triggerToast("Code snippet copied to clipboard");
                  }}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[11px] rounded font-medium flex items-center gap-1 transition-colors text-zinc-200"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto p-2 bg-black/40 rounded-lg leading-relaxed">
                {getCodeSnippet()}
              </pre>
            </div>
          </div>

          {/* Right Column: Live Terminal Output */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-[#1b1c1a] rounded-2xl p-5 border border-[#30363d] shadow-sm text-white flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="text-xs font-mono text-zinc-300 font-bold ml-2">Console Live Response</span>
                </div>

                {executionResult && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        executionResult.status === 200
                          ? "bg-emerald-900/60 text-emerald-400 border border-emerald-500/40"
                          : executionResult.status === 402
                          ? "bg-amber-900/60 text-amber-300 border border-amber-500/40"
                          : "bg-rose-900/60 text-rose-400 border border-rose-500/40"
                      }`}
                    >
                      HTTP {executionResult.status} {executionResult.statusText}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">⚡ {executionResult.latencyMs}ms</span>
                  </div>
                )}
              </div>

              {/* Console Body */}
              <div className="flex-1 overflow-y-auto max-h-[580px] font-mono text-xs">
                {isExecuting ? (
                  <div className="py-16 flex flex-col items-center justify-center text-zinc-400 gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#d4af37]" />
                    <span>Dispatching test request across Base Sepolia node gateway...</span>
                  </div>
                ) : executionResult ? (
                  <div className="space-y-3">
                    {/* Headers summary */}
                    {executionResult.headers?.["payment-required"] && (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200">
                        <span className="font-bold block text-amber-400 mb-1">HTTP 402 Challenge Header:</span>
                        <span className="break-all font-mono">{executionResult.headers["payment-required"]}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                        Response Body
                      </span>
                      <pre className="bg-black/60 p-3 rounded-lg text-emerald-300 overflow-x-auto text-[11px] leading-relaxed border border-zinc-800">
                        {JSON.stringify(executionResult.body, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-zinc-500 text-center px-4">
                    <Terminal className="w-10 h-10 text-zinc-700 mb-2" />
                    <span className="font-bold text-zinc-400">No Request Executed Yet</span>
                    <span className="text-[11px] max-w-sm mt-1 text-zinc-500">
                      Select an endpoint on the left, customize your JSON payload if desired, and click &quot;⚡ Test Run in Console&quot; to inspect live response headers.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: WEBHOOKS & EVENT DISPATCHER */}
      {activeTab === "webhooks" && (
        <div className="flex flex-col gap-6">
          {/* Top row: Register Webhook & Webhook Test Console */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Register Webhook Form */}
            <div className="bg-white rounded-2xl p-6 border border-[#efeeeb] shadow-sm flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-[#1b1c1a] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#735c00]" />
                    <span>Register Webhook Endpoint</span>
                  </h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                    HMAC-SHA256 Signed
                  </span>
                </div>
                <p className="text-xs text-[#5b5e66] mb-4">
                  Register your HTTPS callback to receive verified, real-time push events whenever micro-settlements complete.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#1b1c1a] block mb-1">Webhook URL</label>
                    <input
                      type="url"
                      placeholder="https://your-service.com/api/agentbucket-webhook"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      className="w-full bg-[#fbfbf9] border border-[#d0c5af]/50 rounded-xl px-3.5 py-2 text-xs text-[#1b1c1a] focus:outline-none focus:ring-1 focus:ring-[#735c00]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#1b1c1a] block mb-1">Description (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Accounting Micro-Settlement Sync"
                      value={newWebhookDesc}
                      onChange={(e) => setNewWebhookDesc(e.target.value)}
                      className="w-full bg-[#fbfbf9] border border-[#d0c5af]/50 rounded-xl px-3.5 py-2 text-xs text-[#1b1c1a] focus:outline-none focus:ring-1 focus:ring-[#735c00]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#1b1c1a] block mb-1.5">Subscribed Events</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "settlement.completed", label: "settlement.completed" },
                        { id: "balance.low", label: "balance.low" },
                        { id: "task.failed", label: "task.failed" },
                        { id: "service.status_changed", label: "service.status_changed" },
                      ].map((ev) => {
                        const checked = newWebhookEvents.includes(ev.id);
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => {
                              if (checked) {
                                setNewWebhookEvents(newWebhookEvents.filter((x) => x !== ev.id));
                              } else {
                                setNewWebhookEvents([...newWebhookEvents, ev.id]);
                              }
                            }}
                            className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border font-bold transition-all ${
                              checked
                                ? "bg-amber-100 border-[#d4af37] text-[#735c00]"
                                : "bg-[#f5f3f0] border-transparent text-[#5b5e66]"
                            }`}
                          >
                            {checked ? "✓ " : "+ "}
                            {ev.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRegisterWebhook}
                disabled={isRegisteringWebhook}
                className="w-full py-2.5 bg-[#d4af37] hover:brightness-105 text-[#554300] font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {isRegisteringWebhook ? "Registering..." : "+ Create Webhook & Generate Signing Secret"}
              </button>
            </div>

            {/* Live Webhook Ping Tester */}
            <div className="bg-white rounded-2xl p-6 border border-[#efeeeb] shadow-sm flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-[#1b1c1a] flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#735c00]" />
                    <span>Webhook Event Simulator &amp; Ping Tester</span>
                  </h3>
                  <span className="text-[10px] font-mono text-[#5b5e66]">X-AgentBucket-Signature</span>
                </div>
                <p className="text-xs text-[#5b5e66] mb-4">
                  Dispatch a real cryptographic test event signed with HMAC-SHA256 to verify receipt at your server.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#1b1c1a] block mb-1">Target Webhook URL</label>
                    <input
                      type="url"
                      value={testWebhookUrl}
                      onChange={(e) => setTestWebhookUrl(e.target.value)}
                      placeholder="https://your-domain.com/webhook"
                      className="w-full bg-[#fbfbf9] border border-[#d0c5af]/50 rounded-xl px-3.5 py-2 text-xs text-[#1b1c1a] focus:outline-none focus:ring-1 focus:ring-[#735c00] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#1b1c1a] block mb-1">Test Event Type</label>
                    <select
                      value={testWebhookEvent}
                      onChange={(e) => setTestWebhookEvent(e.target.value)}
                      className="w-full bg-[#fbfbf9] border border-[#d0c5af]/50 rounded-xl px-3.5 py-2 text-xs text-[#1b1c1a] focus:outline-none font-mono"
                    >
                      <option value="settlement.completed">settlement.completed (Micro-claim settled)</option>
                      <option value="balance.low">balance.low (Buyer balance under $2.00 USDC)</option>
                      <option value="task.failed">task.failed (Output schema mismatch &amp; dispute)</option>
                      <option value="service.status_changed">service.status_changed (Node SLA update)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleTestPing}
                disabled={isPinging}
                className="w-full py-2.5 bg-[#1b1c1a] hover:bg-[#2d2e2b] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isPinging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching Signed Event...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>🚀 Dispatch Signed Webhook Event</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Test Ping Delivery Results Box (if triggered) */}
          {testPingResult && (
            <div className="bg-[#1b1c1a] rounded-2xl p-5 border border-[#30363d] shadow-sm text-white">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-zinc-200">Delivery Receipt: {testPingResult.url}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      testPingResult.statusCode === 200
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-950 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    HTTP {testPingResult.statusCode}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">⚡ {testPingResult.latencyMs}ms</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                    HTTP Request Headers
                  </span>
                  <pre className="bg-black/60 p-3 rounded-lg text-amber-200 text-[10px] overflow-x-auto border border-zinc-800">
                    {JSON.stringify(testPingResult.headers, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                    Signed Event Payload (JSON)
                  </span>
                  <pre className="bg-black/60 p-3 rounded-lg text-emerald-300 text-[10px] overflow-x-auto border border-zinc-800">
                    {JSON.stringify(testPingResult.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Registered Webhooks Table */}
          <div className="bg-white rounded-2xl p-6 border border-[#efeeeb] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#1b1c1a]">Active Registered Webhook Endpoints</h3>
                <p className="text-xs text-[#5b5e66]">Manage active callback bridges and inspect secret signing keys.</p>
              </div>
              <button
                onClick={loadWebhooks}
                className="p-1.5 rounded-lg border border-[#efeeeb] hover:bg-[#f5f3f0] text-xs text-[#5b5e66] flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingWebhooks ? (
              <div className="py-8 text-center text-xs text-[#5b5e66]">Loading webhooks...</div>
            ) : webhooks.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5b5e66]">
                No webhooks registered yet. Register an endpoint above!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#efeeeb] text-[#5b5e66] text-[11px]">
                      <th className="py-2.5 px-3">Endpoint URL</th>
                      <th className="py-2.5 px-3">Events</th>
                      <th className="py-2.5 px-3">Signing Secret (HMAC)</th>
                      <th className="py-2.5 px-3">Deliveries</th>
                      <th className="py-2.5 px-3">Last Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f4f4f2]">
                    {webhooks.map((wh) => {
                      const isRevealed = revealedSecrets[wh.id];
                      return (
                        <tr key={wh.id} className="hover:bg-[#fbfbf9]">
                          <td className="py-3 px-3 font-mono font-semibold text-[#1b1c1a]">
                            <div>{wh.url}</div>
                            {wh.description && <div className="text-[10px] text-[#8c8f94]">{wh.description}</div>}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {(wh.events || []).map((ev: string) => (
                                <span key={ev} className="text-[9px] font-mono bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded">
                                  {ev}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[#735c00]">
                                {isRevealed ? wh.secret : `${wh.secret.slice(0, 10)}••••••••••••`}
                              </span>
                              <button
                                onClick={() =>
                                  setRevealedSecrets({ ...revealedSecrets, [wh.id]: !isRevealed })
                                }
                                className="text-[#8c8f94] hover:text-[#1b1c1a]"
                              >
                                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(wh.secret);
                                  triggerToast("Webhook secret copied!");
                                }}
                                className="text-[#8c8f94] hover:text-[#1b1c1a]"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[#5b5e66]">{wh.deliveryCount || 0}</td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700">
                              HTTP {wh.lastStatusCode || 200} OK
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setTestWebhookUrl(wh.url);
                                  handleTestPing();
                                }}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#735c00] font-bold text-[10px] rounded"
                              >
                                Ping
                              </button>
                              <button
                                onClick={() => handleDeleteWebhook(wh.id)}
                                className="p-1 text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB 3: AI AGENTS, MCP & CLI TOOLING */}
      {activeTab === "tooling" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Model Context Protocol (MCP) Server */}
          <div className="bg-white rounded-2xl p-6 border border-[#efeeeb] shadow-sm flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                  AI IDE Integration
                </span>
                <span className="text-[10px] font-mono text-[#5b5e66]">v1.0.0</span>
              </div>
              <h3 className="text-base font-bold text-[#1b1c1a] flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-purple-600" />
                <span>AgentBucket MCP Server</span>
              </h3>
              <p className="text-xs text-[#5b5e66] mb-3">
                Connect <strong>Claude Desktop</strong>, <strong>Cursor</strong>, <strong>Antigravity IDE</strong>, or <strong>Windsurf</strong> directly to your x402 marketplace on Base Sepolia.
              </p>

              <div className="bg-[#1b1c1a] p-3 rounded-xl text-white font-mono text-[11px] mb-3 border border-zinc-800">
                <span className="text-zinc-500 block mb-1"># claude_desktop_config.json / .cursor/mcp.json</span>
                <pre className="text-purple-300 overflow-x-auto">
{`{
  "mcpServers": {
    "agentbucket": {
      "command": "node",
      "args": ["c:/Users/salun/Desktop/Hackthon/mcp/server.js"]
    }
  }
}`}
                </pre>
              </div>

              <div className="text-[11px] text-[#5b5e66] space-y-1">
                <span className="font-bold text-[#1b1c1a] block">Exposed MCP Tools:</span>
                <div>• <code>list_services</code> - Discover AI catalog</div>
                <div>• <code>get_wallet_balance</code> - Monitor buyer/seller USDC</div>
                <div>• <code>run_buyer_agent</code> - Execute autonomous workflows</div>
                <div>• <code>call_x402_service</code> - Invoke with gasless voucher</div>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify(
                    {
                      mcpServers: {
                        agentbucket: {
                          command: "node",
                          args: ["c:/Users/salun/Desktop/Hackthon/mcp/server.js"],
                        },
                      },
                    },
                    null,
                    2
                  )
                );
                triggerToast("MCP config JSON copied to clipboard!");
              }}
              className="w-full py-2.5 bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy MCP Server Config</span>
            </button>
          </div>

          {/* Card 2: AgentBucket CLI Tool */}
          <div className="bg-white rounded-2xl p-6 border border-[#efeeeb] shadow-sm flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  Terminal Utility
                </span>
                <span className="text-[10px] font-mono text-[#5b5e66]">@agentbucket/cli</span>
              </div>
              <h3 className="text-base font-bold text-[#1b1c1a] flex items-center gap-2 mb-1">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span>AgentBucket Terminal CLI</span>
              </h3>
              <p className="text-xs text-[#5b5e66] mb-3">
                Manage testnet balances, discover active services, launch autonomous agent jobs, and audit micro-settlements straight from your shell.
              </p>

              <div className="bg-[#1b1c1a] p-3 rounded-xl text-white font-mono text-[11px] mb-3 border border-zinc-800 space-y-2">
                <div>
                  <span className="text-zinc-500 block"># Check balances</span>
                  <span className="text-blue-300">$ agentbucket balance</span>
                </div>
                <div>
                  <span className="text-zinc-500 block"># Launch agent job</span>
                  <span className="text-blue-300">$ agentbucket run &quot;Summarize and classify sentiment&quot; --budget 0.20</span>
                </div>
                <div>
                  <span className="text-zinc-500 block"># Test webhook signature</span>
                  <span className="text-blue-300">$ agentbucket webhook test https://my-app.io/hook</span>
                </div>
              </div>

              <div className="text-[11px] text-[#5b5e66] space-y-1">
                <span className="font-bold text-[#1b1c1a] block">CLI Highlights:</span>
                <div>• Zero-dependency lightweight binary</div>
                <div>• Direct EIP-3009 offline payment signing</div>
                <div>• Pretty-printed terminal status tables</div>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText("node c:/Users/salun/Desktop/Hackthon/cli/bin/agentbucket.js --help");
                triggerToast("CLI run command copied!");
              }}
              className="w-full py-2.5 bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy CLI Quickstart</span>
            </button>
          </div>

          {/* Card 3: Official TypeScript SDK */}
          <div className="bg-white rounded-2xl p-6 border border-[#efeeeb] shadow-sm flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Node &amp; Browser SDK
                </span>
                <span className="text-[10px] font-mono text-[#5b5e66]">@agentbucket/sdk</span>
              </div>
              <h3 className="text-base font-bold text-[#1b1c1a] flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>AgentBucket TypeScript SDK</span>
              </h3>
              <p className="text-xs text-[#5b5e66] mb-3">
                Full-featured TypeScript SDK providing programmatic access to the x402 marketplace, wallet topups, and webhook signature verification.
              </p>

              <div className="bg-[#1b1c1a] p-3 rounded-xl text-white font-mono text-[11px] mb-3 border border-zinc-800">
                <span className="text-zinc-500 block mb-1"># Programmatic SDK example</span>
                <pre className="text-emerald-300 overflow-x-auto">
{`import { AgentBucketClient } from "@agentbucket/sdk";

const client = new AgentBucketClient();

// Discover services
const list = await client.services.list();

// Run autonomous workflow
const run = await client.agent.run({
  task: "Scrape books and check FX",
  budgetUsdc: 0.15
});`}
                </pre>
              </div>

              <div className="text-[11px] text-[#5b5e66] space-y-1">
                <span className="font-bold text-[#1b1c1a] block">SDK Capabilities:</span>
                <div>• Complete TypeScript type definitions</div>
                <div>• Automatic timingSafeEqual webhook HMAC verifier</div>
                <div>• Dual Node.js and Browser fetch compatibility</div>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText("npm install @agentbucket/sdk");
                triggerToast("npm install command copied!");
              }}
              className="w-full py-2.5 bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy npm install Command</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. TAB 4: EIP-3009 GASLESS SPECS */}
      {activeTab === "specs" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-[#efeeeb] shadow-sm flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#1b1c1a] flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-[#735c00]" />
                <span>EIP-712 Typed Data Specification</span>
              </h3>
              <p className="text-xs text-[#5b5e66] mb-3">
                AgentBucket uses EIP-3009 <code>transferWithAuthorization</code> for USDC on Base Sepolia. Buyers sign an off-chain typed data structure with zero gas cost.
              </p>
              <pre className="bg-[#1b1c1a] text-amber-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-[#30363d]">
{`{
  "types": {
    "TransferWithAuthorization": [
      { "name": "from", "type": "address" },
      { "name": "to", "type": "address" },
      { "name": "value", "type": "uint256" },
      { "name": "validAfter", "type": "uint256" },
      { "name": "validBefore", "type": "uint256" },
      { "name": "nonce", "type": "bytes32" }
    ]
  },
  "domain": {
    "name": "USD Coin",
    "version": "2",
    "chainId": 84532,
    "verifyingContract": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
}`}
              </pre>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
                triggerToast("Base Sepolia USDC address copied");
              }}
              className="px-4 py-2 bg-[#f5f3f0] hover:bg-[#eae8e5] text-xs font-semibold text-[#1b1c1a] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy USDC Contract Address</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#efeeeb] shadow-sm flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#1b1c1a] flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#735c00]" />
                <span>Security &amp; Relayer Architecture</span>
              </h3>
              <p className="text-xs text-[#5b5e66] mb-3">
                How AgentBucket guarantees non-custodial cryptographic security and zero-gas execution:
              </p>

              <div className="space-y-3 text-xs text-[#4d4635]">
                <div className="p-3 bg-[#fbfbf9] rounded-xl border border-[#efeeeb]">
                  <span className="font-bold text-[#1b1c1a] block mb-0.5">1. Offline Cryptographic Authorization</span>
                  <span>Vouchers are signed off-chain via secp256k1. Private keys never touch third-party servers.</span>
                </div>

                <div className="p-3 bg-[#fbfbf9] rounded-xl border border-[#efeeeb]">
                  <span className="font-bold text-[#1b1c1a] block mb-0.5">2. Guaranteed Gas Sponsorship</span>
                  <span>The AgentBucket Relayer pays all Base L2 gas fees on behalf of participants upon output validation.</span>
                </div>

                <div className="p-3 bg-[#fbfbf9] rounded-xl border border-[#efeeeb]">
                  <span className="font-bold text-[#1b1c1a] block mb-0.5">3. Ajv Strict Schema Dispute Shield</span>
                  <span>If a provider returns invalid data or SLA breaks, the voucher is voided and $0.00 is debited.</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Verified on Base Sepolia Block Explorer (EIP-155:84532)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
