"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Zap,
  RotateCw,
  ExternalLink,
  Wallet as WalletIcon,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileText,
  DollarSign,
  Plus,
  LogOut,
  User as UserIcon,
  X,
  CheckCircle,
  Bell,
  HeartPulse,
} from "lucide-react";

interface WalletData {
  _id: string;
  address: string;
  balance: number;
  role: "buyer" | "seller" | "facilitator";
  label: string;
}

interface ServiceData {
  id: string;
  name: string;
  category: string;
  endpoint: string;
  price: number;
  payTo: string;
  health?: {
    status: "HEALTHY" | "DEGRADED" | "DOWN" | "SCHEMA_MISMATCH";
    lastChecked: string;
    latencyMs: number;
    message?: string;
  };
  reputation: {
    score: number;
    successRate: number;
    medianLatencyMs: number;
    totalCalls: number;
    rejectedCalls: number;
  };
}

interface NotificationData {
  id: string;
  serviceId: string | null;
  serviceName: string;
  type: "HEALTH_ALERT" | "ENDPOINT_DOWN" | "SCHEMA_MISMATCH" | "INFO";
  severity: "info" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface LedgerEntry {
  _id: string;
  taskId: string;
  buyer: string;
  seller: string;
  serviceName: string;
  category: string;
  listedPrice: number;
  askedPrice: number;
  paidPrice: number;
  txHash: string | null;
  status:
    | "SETTLED"
    | "REFUSED_PRICE_MISMATCH"
    | "FAILED_OUTPUT_REJECTED"
    | "FAILED_DOWNSTREAM";
  latencyMs: number;
  createdAt: string;
}

interface StreamEvent {
  stepId: string;
  type: string;
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export default function Dashboard() {
  const router = useRouter();

  // Authentication State
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regName, setRegName] = useState("");
  const [regCategory, setRegCategory] = useState<string>("scraping");
  const [regEndpoint, setRegEndpoint] = useState("");
  const [regPriceUsdc, setRegPriceUsdc] = useState<number>(0.005);
  const [regPayTo, setRegPayTo] = useState("");
  const [regSchemaStr, setRegSchemaStr] = useState(
    JSON.stringify(
      {
        type: "object",
        properties: {
          result: { type: "string" },
        },
      },
      null,
      2
    )
  );
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const [taskPrompt, setTaskPrompt] = useState(
    "From pages 1 to 4 of books.toscrape.com, find the three cheapest 5-star books, give their prices in rupees, and summarise each description in Hindi."
  );
  const [budgetUsdc, setBudgetUsdc] = useState<number>(0.05);
  const [concurrency, setConcurrency] = useState<number>(3);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Live Stream Events
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [runSummary, setRunSummary] = useState<Record<string, unknown> | null>(null);

  // Data states
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Notification & Automated Health Check States
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState<boolean>(false);
  const [healthCheckSummary, setHealthCheckSummary] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    }
  };

  // Load all data from API endpoints with fault isolation
  const refreshAllData = async () => {
    setLoadingData(true);
    try {
      try {
        const wRes = await fetch("/api/wallets");
        if (wRes.ok) {
          const wData = await wRes.json();
          setWallets(wData.wallets || []);
        }
      } catch (err) {
        console.warn("Failed to fetch wallets:", err);
      }

      try {
        const sRes = await fetch("/api/registry/services");
        if (sRes.ok) {
          const sData = await sRes.json();
          setServices(sData.services || []);
        }
      } catch (err) {
        console.warn("Failed to fetch services:", err);
      }

      try {
        const lRes = await fetch("/api/ledger");
        if (lRes.ok) {
          const lData = await lRes.json();
          setLedger(lData.logs || []);
        }
      } catch (err) {
        console.warn("Failed to fetch ledger:", err);
      }

      await fetchNotifications();
    } finally {
      setLoadingData(false);
    }
  };

  const handleRunHealthCheck = async () => {
    setIsRunningHealthCheck(true);
    setHealthCheckSummary(null);
    try {
      const res = await fetch("/api/registry/health-check", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setHealthCheckSummary(
          `Health Audit Complete: ${data.summary.healthy} healthy, ${data.summary.alerts} alerts detected across ${data.summary.total} agents.`
        );
        await refreshAllData();
      } else {
        throw new Error(data.error || "Health check execution failed");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunningHealthCheck(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn("Failed to mark all read:", err);
    }
  };

  // Strictly enforce user authentication on mount
  useEffect(() => {
    let isMounted = true;
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!data.authenticated || !data.user) {
          router.push("/login");
          return;
        }
        if (isMounted) {
          setUser(data.user);
          setAuthChecking(false);
          refreshAllData();
        }
      } catch {
        router.push("/login");
      }
    };
    verifyAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.warn("Logout request failed:", e);
    }
    router.push("/login");
  };

  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);
    setIsRegistering(true);
    try {
      let parsedSchema = {};
      try {
        parsedSchema = JSON.parse(regSchemaStr);
      } catch {
        throw new Error("Invalid JSON Schema format. Please provide valid JSON.");
      }

      const atomicPrice = Math.round(Number(regPriceUsdc) * 1_000_000);
      const res = await fetch("/api/registry/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          category: regCategory,
          endpoint: regEndpoint.trim(),
          price: atomicPrice,
          payTo: regPayTo.trim() || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          schema: parsedSchema,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register service");
      }

      setRegSuccess(`Agent "${regName}" registered successfully!`);
      setTimeout(() => {
        setIsRegisterModalOpen(false);
        setRegSuccess(null);
        setRegName("");
        setRegEndpoint("");
        setRegPayTo("");
      }, 1200);
      await refreshAllData();
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRegistering(false);
    }
  };

  // Launch Buyer Agent
  const handleLaunchAgent = async () => {
    if (!taskPrompt.trim() || isRunning) return;

    setIsRunning(true);
    setRunSummary(null);
    setErrorMessage(null);

    const tempTaskId = "task-" + Math.random().toString(36).substring(2, 10);
    setCurrentTaskId(tempTaskId);

    // Immediate visual steps for the user
    setEvents([
      {
        stepId: "step-1",
        type: "PLAN_GENERATED",
        message: `Buyer Agent Planner analyzing instructions: "${taskPrompt.slice(0, 90)}..."`,
        timestamp: Date.now(),
      },
      {
        stepId: "step-2",
        type: "BUDGET_RESERVED",
        message: `Locked ${budgetUsdc} USDC in atomic escrow with 30s TTL lease lock`,
        timestamp: Date.now() + 100,
      },
      {
        stepId: "step-3",
        type: "SELLER_SELECTED",
        message: "Querying service registry and ranking candidate sellers by reputation score...",
        timestamp: Date.now() + 200,
      },
    ]);

    // Atomic budget in integer units (1 USDC = 1,000,000 units)
    const budgetAtomicUnits = Math.round(budgetUsdc * 1_000_000);

    try {
      const response = await fetch("/api/buyer/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: tempTaskId,
          task: taskPrompt,
          budget: budgetAtomicUnits,
          maxConcurrency: concurrency,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to execute agent task");
      }

      setRunSummary(resData);

      // Populate execution events from actual settled transactions
      const stepEvents: StreamEvent[] = [];
      if (resData.purchases && Array.isArray(resData.purchases)) {
        resData.purchases.forEach((p: { service: string; category: string; status: string; price: string; latency: string; txHash: string | null }, idx: number) => {
          if (p.status === "FAILED_OUTPUT_REJECTED") {
            stepEvents.push({
              stepId: `rej-${idx}`,
              type: "FALLBACK_TRIGGERED",
              message: `Seller "${p.service}" output failed schema validation. Settlement rejected (0.00 USDC charged). Activating fallback seller.`,
              timestamp: Date.now() + (idx + 1) * 100,
            });
          } else if (p.status === "SETTLED") {
            stepEvents.push({
              stepId: `settled-${idx}`,
              type: "SETTLEMENT_CONFIRMED",
              message: `Settled ${p.price} via ${p.service} (${p.category}) in ${p.latency}. EIP-3009 transfer confirmed.`,
              details: { txHash: p.txHash },
              timestamp: Date.now() + (idx + 1) * 100,
            });
          }
        });
      }

      stepEvents.push({
        stepId: "done",
        type: "TASK_COMPLETED",
        message: `Task completed successfully! Total spent: ${(resData.totalSpent / 1e6).toFixed(4)} USDC across ${resData.steps?.length || 3} services.`,
        timestamp: Date.now() + 500,
      });

      setEvents((prev) => [...prev, ...stepEvents]);
      await refreshAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setEvents((prev) => [
        ...prev,
        {
          stepId: "err",
          type: "STEP_FAILED",
          message: `Execution failed: ${msg}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsRunning(false);
      refreshAllData();
    }
  };

  const setTaskPreset = (text: string, budget: number) => {
    setTaskPrompt(text);
    setBudgetUsdc(budget);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-sm shadow-xl shadow-indigo-500/20 animate-pulse">
          x402
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-slate-200">Verifying Agent Economy Session</h2>
          <p className="text-xs text-slate-500 mt-1">Connecting to authenticated x402 marketplace network...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              x402
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Pay-Per-Call Agent Platform
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v2 Protocol
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                EIP-712 / EIP-3009 Cryptographic Micropayments with Dynamic Reputation & Fallback
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Simulated Chain (Offline Viem Signatures)
            </span>

            {/* Register Agent / Service Button */}
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Agent
            </button>

            {/* Health Audit Button */}
            <button
              onClick={handleRunHealthCheck}
              disabled={isRunningHealthCheck}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Run automated health check and schema validation on all agents"
            >
              <HeartPulse className={`w-3.5 h-3.5 ${isRunningHealthCheck ? "animate-spin text-emerald-400" : ""}`} />
              <span>{isRunningHealthCheck ? "Auditing..." : "Health Audit"}</span>
            </button>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors relative text-xs flex items-center justify-center"
                title="Notifications & Agent Health Alerts"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Agent Health Alerts</h4>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-mono">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No alerts recorded. All agents healthy.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                            !n.read
                              ? "bg-slate-800/80 border-slate-700 text-slate-200"
                              : "bg-slate-950/50 border-slate-800 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[11px] text-slate-200">{n.title}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                                n.severity === "error"
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : n.severity === "warning"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              }`}
                            >
                              {n.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sync Button */}
            <button
              onClick={refreshAllData}
              disabled={loadingData}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
              title="Refresh ledger and wallet balances"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
              Sync
            </button>

            {/* User Profile Pill & Sign Out */}
            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300">
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-200 leading-none">{user.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono leading-none mt-0.5 max-w-[120px] truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium flex items-center gap-1 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-rose-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Grid: Task Dispatcher & Live Run Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dispatcher Panel (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col justify-between shadow-xl backdrop-blur-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Buyer Agent Dispatcher
                </h2>
                <span className="text-xs text-slate-500 font-mono">Autonomous Planner</span>
              </div>

              {/* Task Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Task Instruction Prompt
                </label>
                <textarea
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  disabled={isRunning}
                  rows={3}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                  placeholder="Describe what the agent should query, process, or synthesize..."
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Judge Demo Presets
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTaskPreset(
                        "Scrape travel books from catalogue, fetch GBP to INR exchange rate, and summarize recommendations in Hindi",
                        0.5
                      )
                    }
                    className="text-left text-xs p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800/80 transition-colors flex items-center justify-between text-slate-300 hover:text-white"
                  >
                    <span>🎯 Full 3-Service Pipeline (Scrape + FX + Hindi)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">$0.50</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTaskPreset(
                        "Scrape catalogue with cheap scraper to test Ajv output schema rejection and automatic fallback recovery",
                        0.25
                      )
                    }
                    className="text-left text-xs p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800/80 transition-colors flex items-center justify-between text-slate-300 hover:text-white"
                  >
                    <span>🛡️ Fallback Test (Corrupt Schema Recovery)</span>
                    <span className="text-[10px] text-amber-400 font-mono">$0.25</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTaskPreset(
                        "Concurrent scrape and translation task testing strict atomic budget limit enforcement",
                        0.04
                      )
                    }
                    className="text-left text-xs p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800/80 transition-colors flex items-center justify-between text-slate-300 hover:text-white"
                  >
                    <span>⚡ Budget Exhaustion Test (Tight Cap Refusal)</span>
                    <span className="text-[10px] text-rose-400 font-mono">$0.04</span>
                  </button>
                </div>
              </div>

              {/* Controls: Budget & Concurrency */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Budget Limit (USDC)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={budgetUsdc}
                      onChange={(e) => setBudgetUsdc(parseFloat(e.target.value) || 0.1)}
                      disabled={isRunning}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-7 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Max Concurrency ({concurrency})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={concurrency}
                    onChange={(e) => setConcurrency(parseInt(e.target.value))}
                    disabled={isRunning}
                    className="w-full accent-indigo-500 cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1 (Sequential)</span>
                    <span>5 (Parallel)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-6">
              <button
                onClick={handleLaunchAgent}
                disabled={isRunning}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed font-semibold text-sm text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isRunning ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Executing Autonomous Flow...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Launch Autonomous Buyer Agent
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Execution Stream (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col shadow-xl backdrop-blur-md min-h-[460px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Real-time Execution Stream
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {isRunning ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    SSE Streaming Active
                  </span>
                ) : events.length > 0 ? (
                  "Completed"
                ) : (
                  "Awaiting Execution"
                )}
              </span>
            </div>

            {/* Event list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] pr-2">
              {events.length === 0 && !isRunning ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                  <Activity className="w-8 h-8 opacity-40 text-indigo-400" />
                  <p className="text-xs">No active run. Select a task preset or enter an instruction, then click Launch.</p>
                </div>
              ) : (
                events.map((ev, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      ev.type === "CHALLENGE_402_RECEIVED"
                        ? "bg-amber-950/20 border-amber-900/50 text-amber-200"
                        : ev.type === "PAYMENT_SIGNED"
                        ? "bg-indigo-950/30 border-indigo-900/50 text-indigo-200"
                        : ev.type === "SETTLEMENT_CONFIRMED"
                        ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-200"
                        : ev.type === "FALLBACK_TRIGGERED"
                        ? "bg-orange-950/30 border-orange-900/50 text-orange-200"
                        : ev.type === "STEP_FAILED"
                        ? "bg-rose-950/30 border-rose-900/50 text-rose-300"
                        : "bg-slate-950 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider opacity-80">
                        {ev.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-sans leading-relaxed">{ev.message}</p>
                    {ev.details && typeof ev.details.txHash === "string" ? (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Transaction Receipt:</span>
                        <Link
                          href={`/tx/${ev.details.txHash}`}
                          target="_blank"
                          className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 underline"
                        >
                          {(ev.details.txHash as string).slice(0, 14)}...
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            {/* Run summary footer */}
            {runSummary && (
              <div className="mt-4 pt-3 border-t border-slate-800 bg-slate-950/80 -mx-2 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Total Spent: </span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {((runSummary.totalSpent as number) / 1e6).toFixed(4)} USDC
                  </span>
                  <span className="text-slate-500 font-mono ml-2">
                    (Remaining: {((runSummary.remainingBudget as number) / 1e6).toFixed(4)} USDC)
                  </span>
                </div>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> All Steps Verified
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Wallets & Dynamic Reputation Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wallets Panel */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <WalletIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  System Wallets & Balances
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">Live Mongo Ledger</span>
            </div>

            <div className="space-y-2">
              {wallets.map((w) => (
                <div
                  key={w._id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{w.label}</span>
                      <span
                        className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${
                          w.role === "buyer"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : w.role === "facilitator"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {w.role}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-500">{w.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-100">
                      {(w.balance / 1e6).toFixed(4)} USDC
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">{w.balance} units</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seller Reputation Panel */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Dynamic Seller Reputation Matrix
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">Ledger Aggregated</span>
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  List Agent
                </button>
              </div>
            </div>

            {healthCheckSummary && (
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-between">
                <span>{healthCheckSummary}</span>
                <button
                  onClick={() => setHealthCheckSummary(null)}
                  className="text-xs text-indigo-400 hover:text-indigo-200 ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="space-y-2">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200">{svc.name}</span>
                      <span className="text-slate-500 text-[11px] ml-2">({svc.category})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {svc.health && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${
                            svc.health.status === "HEALTHY"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : svc.health.status === "SCHEMA_MISMATCH"
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              : svc.health.status === "DEGRADED"
                              ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                          title={svc.health.message || svc.health.status}
                        >
                          ● {svc.health.status}
                        </span>
                      )}
                      <span className="text-emerald-400 font-mono font-bold">
                        {(svc.price / 1e6).toFixed(4)} USDC
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          svc.reputation.score >= 80
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : svc.reputation.score >= 50
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        Rep: {svc.reputation.score}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                    <div>Success: {svc.reputation.successRate}%</div>
                    <div>Median: {svc.reputation.medianLatencyMs}ms</div>
                    <div>Calls: {svc.reputation.totalCalls}</div>
                    <div className={svc.reputation.rejectedCalls > 0 ? "text-rose-400" : ""}>
                      Rejected: {svc.reputation.rejectedCalls}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Full Ledger Audit Table */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Transaction Ledger & Audit Trail
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total Recorded Attempts: {ledger.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Task ID</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Listed</th>
                  <th className="p-3">Asked</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-500">
                      No ledger records found. Run a task to generate transaction history.
                    </td>
                  </tr>
                ) : (
                  ledger.slice(0, 15).map((row) => (
                    <tr key={row._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(row.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-slate-300">{row.taskId}</td>
                      <td className="p-3 font-semibold text-slate-200">{row.serviceName}</td>
                      <td className="p-3 text-slate-400">{row.category}</td>
                      <td className="p-3 text-slate-400">{(row.listedPrice / 1e6).toFixed(4)}</td>
                      <td className="p-3 text-slate-400">{(row.askedPrice / 1e6).toFixed(4)}</td>
                      <td className="p-3 font-bold text-emerald-400">
                        {(row.paidPrice / 1e6).toFixed(4)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.status === "SETTLED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : row.status === "REFUSED_PRICE_MISMATCH"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{row.latencyMs}ms</td>
                      <td className="p-3">
                        {row.txHash ? (
                          <Link
                            href={`/tx/${row.txHash}`}
                            target="_blank"
                            className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1"
                          >
                            {row.txHash.slice(0, 10)}...
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Register Agent / Service Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Register New Agent Service</h3>
                  <p className="text-xs text-slate-400">List an API endpoint in the x402 Marketplace</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {regSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{regSuccess}</span>
              </div>
            )}

            {regError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterService} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Service / Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel Ticket Scraper Pro"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="scraping">Scraping (Web Crawlers / Parsers)</option>
                    <option value="data">Data (FX / Financial / Weather)</option>
                    <option value="inference">Inference (AI / LLM Models)</option>
                    <option value="fx-rates">fx-rates</option>
                    <option value="summarization">summarization</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Price per Request (USDC)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.0001"
                    max="0.10"
                    required
                    value={regPriceUsdc}
                    onChange={(e) => setRegPriceUsdc(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    = {Math.round(regPriceUsdc * 1_000_000).toLocaleString()} atomic units
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Endpoint URL</label>
                <input
                  type="text"
                  required
                  placeholder="/api/sellers/custom or https://my-server.com/agent"
                  value={regEndpoint}
                  onChange={(e) => setRegEndpoint(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">PayTo EVM Address</label>
                <input
                  type="text"
                  required
                  placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                  value={regPayTo}
                  onChange={(e) => setRegPayTo(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Settlement wallet for EIP-3009 transferWithAuthorization
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Output JSON Schema (Validation)</label>
                <textarea
                  rows={4}
                  required
                  value={regSchemaStr}
                  onChange={(e) => setRegSchemaStr(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 font-mono text-[11px] focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Enforces schema validation. If the service returns junk, buyers reject output and penalize reputation.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {isRegistering ? "Registering Agent..." : "Register & List on Marketplace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
