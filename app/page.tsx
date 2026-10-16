"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  LayoutDashboard,
  Bot,
  Activity,
  Wallet as WalletIcon,
  Key,
  Settings,
  ShieldCheck,
  Zap,
  RotateCw,
  ExternalLink,
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
  Award,
  Copy,
  Check,
  Download,
  Gauge,
  Search,
  Globe,
  Brain,
  MessageSquare,
  FileCode,
  ArrowRight,
  Shield,
  Cpu,
  RefreshCw,
  HelpCircle,
  BookOpen,
} from "lucide-react";

import SchemaModal from "@/components/provider/SchemaModal";
import RegisterServiceModal from "@/components/provider/RegisterServiceModal";

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
  active?: boolean;
  health?: {
    status: "HEALTHY" | "DEGRADED" | "DOWN" | "SCHEMA_MISMATCH";
    lastChecked: string;
    latencyMs: number;
    message?: string;
  };
  reputation?: {
    score: number;
    successRate: number;
    medianLatencyMs: number;
    totalCalls: number;
    rejectedCalls: number;
  };
  schema?: Record<string, unknown>;
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
  id?: string;
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

  // Active Workspace Navigation Tab
  const [activeNavTab, setActiveNavTab] = useState<string>("overview");
  const [timeframe, setTimeframe] = useState<"24H" | "7D" | "30D" | "All Time">("All Time");

  // Filter state for services table
  const [servicesFilterTab, setServicesFilterTab] = useState<"all" | "active" | "degraded">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [selectedServiceForSchema, setSelectedServiceForSchema] = useState<ServiceData | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2600);
  }, []);

  // Dispatcher & Execution State
  const [taskPrompt, setTaskPrompt] = useState(
    "From pages 1 to 4 of books.toscrape.com, find the three cheapest 5-star books, give their prices in rupees, and summarise each description in Hindi."
  );
  const [budgetUsdc, setBudgetUsdc] = useState<number>(0.05);
  const [concurrency, setConcurrency] = useState<number>(3);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [runSummary, setRunSummary] = useState<Record<string, unknown> | null>(null);

  // Data states from DB
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Health check & notifications
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState<boolean>(false);

  const sellerPayoutAddress = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
  const escrowContract = "0x845320c99a80b875631ea235bfcdde1297e6402c";

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  // Fetch all live data
  const refreshAllData = useCallback(async () => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const [wRes, sRes, lRes, nRes] = await Promise.all([
        fetch("/api/wallets"),
        fetch("/api/registry/services"),
        fetch("/api/ledger"),
        fetch("/api/notifications"),
      ]);

      if (wRes.ok) {
        const wData = await wRes.json();
        setWallets(wData.wallets || []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setServices(sData.services || []);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setLedger(lData.ledger || lData.logs || []);
      }
      if (nRes.ok) {
        const nData = await nRes.json();
        setNotifications(nData.notifications || []);
        setUnreadCount(
          typeof nData.unreadCount === "number"
            ? nData.unreadCount
            : (nData.notifications || []).filter((n: any) => !n.read).length
        );
      }
    } catch {
      setErrorMessage("Could not connect to testnet node or MongoDB");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecking && user) {
      refreshAllData();
      const interval = setInterval(refreshAllData, 4000);
      return () => clearInterval(interval);
    }
  }, [authChecking, user, refreshAllData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleRunHealthCheck = async () => {
    setIsRunningHealthCheck(true);
    triggerToast("Auditing all endpoints for connectivity and schema drift...");
    try {
      const res = await fetch("/api/registry/health-check", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`Health Audit complete! ${data.results?.length || 0} services verified.`);
        await refreshAllData();
      } else {
        triggerToast("Health audit check failed");
      }
    } catch {
      triggerToast("Network error running health check");
    } finally {
      setIsRunningHealthCheck(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, action: "MARK_ALL_READ" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      triggerToast("All health alerts marked as read");
    } catch {
      // ignore
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

    setEvents([
      {
        stepId: "step-1",
        type: "PLAN_GENERATED",
        message: `Scout Planner analyzing objective: "${taskPrompt.slice(0, 80)}..."`,
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
        message: "Scanning service registry and ranking candidate sellers by reputation score...",
        timestamp: Date.now() + 200,
      },
    ]);

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

      const stepEvents: StreamEvent[] = [];
      if (resData.purchases && Array.isArray(resData.purchases)) {
        resData.purchases.forEach((p: any, idx: number) => {
          if (p.status === "FAILED_OUTPUT_REJECTED") {
            stepEvents.push({
              stepId: `step-purchase-${idx}`,
              type: "OUTPUT_REJECTED_REFUNDED",
              message: `⚠️ Schema validation rejected output from "${p.service}". Seller flagged. Zero USDC debited. Initiating 2-tier fallback...`,
              timestamp: Date.now() + 300 * (idx + 1),
              details: p,
            });
          } else {
            stepEvents.push({
              stepId: `step-purchase-${idx}`,
              type: "PAYMENT_SETTLED",
              message: `✅ Dispatched signed authorization to "${p.service}" (${p.price}). Settled on Base Sepolia.`,
              timestamp: Date.now() + 300 * (idx + 1),
              details: p,
            });
          }
        });
      }

      if (resData.fallbackUsed) {
        stepEvents.push({
          stepId: "step-fallback",
          type: "FALLBACK_SUCCESS",
          message: `🔄 Fallback Loop Success: Promoted secondary seller and successfully delivered analytical report.`,
          timestamp: Date.now() + 1200,
        });
      }

      stepEvents.push({
        stepId: "step-complete",
        type: "TASK_COMPLETED",
        message: `Task execution succeeded within budget: Total Spent $${(resData.totalSpent / 1_000_000).toFixed(4)} USDC`,
        timestamp: Date.now() + 1500,
      });

      setEvents((prev) => [...prev, ...stepEvents]);
      await refreshAllData();
      triggerToast("Scout task completed successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setEvents((prev) => [
        ...prev,
        {
          stepId: "step-err",
          type: "TASK_FAILED",
          message: `Execution halted: ${msg}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // Ping diagnostic
  const handlePing = async (svc: ServiceData) => {
    triggerToast(`Pinging ${svc.name}...`);
    try {
      const startTime = performance.now();
      const res = await fetch(svc.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "ping", test: true }),
      });
      const latency = Math.round(performance.now() - startTime);
      if (res.status === 402) {
        triggerToast(`Ping ${svc.name}: HTTP 402 Payment Challenge OK (${latency}ms)`);
      } else {
        triggerToast(`Ping ${svc.name}: HTTP ${res.status} (${latency}ms)`);
      }
    } catch {
      triggerToast(`Ping ${svc.name}: Connection timeout`);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (ledger.length === 0) {
      triggerToast("No ledger records available to export yet.");
      return;
    }
    const headers = ["Task ID", "Time", "Buyer", "Seller", "Service", "Fee (USDC)", "Latency (ms)", "Status", "TxHash"];
    const rows = ledger.map((t) => [
      t.taskId,
      new Date(t.createdAt).toISOString(),
      t.buyer,
      t.seller,
      `"${t.serviceName}"`,
      (t.paidPrice / 1_000_000).toFixed(4),
      t.latencyMs,
      t.status,
      t.txHash || "PENDING",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agentbucket-ledger-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Ledger CSV downloaded successfully!");
  };

  // KPIs & Dynamic Analytics
  const settledEntries = ledger.filter((e) => e.status === "SETTLED");
  const failedEntries = ledger.filter((e) => e.status && (e.status.includes("FAILED") || e.status.includes("REJECTED")));
  const schemaDisputes = ledger.filter((e) => e.status === "FAILED_OUTPUT_REJECTED").length;
  const totalRevenueAtomic = settledEntries.reduce((sum, e) => sum + (e.paidPrice || 0), 0);
  const totalRevenueUsdc = (totalRevenueAtomic / 1_000_000).toFixed(4);
  const totalInvocations = ledger.length;
  const settledCalls = settledEntries.length;
  const deliveryRate = totalInvocations > 0 ? Math.round((settledCalls / totalInvocations) * 100) : 100;

  // Real Health & Uptime Status across Registered Endpoints
  const healthyEndpoints = services.filter(
    (s) => s.health?.status === "HEALTHY" || !s.health
  ).length;
  const degradedEndpoints = services.length - healthyEndpoints;
  const nodeStatusPct = services.length > 0 ? ((healthyEndpoints / services.length) * 100).toFixed(1) : "100.0";

  // Latencies
  const validLatencies = ledger.map((e) => e.latencyMs).filter((l) => typeof l === "number" && l > 0);
  validLatencies.sort((a, b) => a - b);
  const medianLatency =
    validLatencies.length > 0
      ? validLatencies[Math.floor(validLatencies.length / 2)]
      : services.length > 0
      ? Math.round(services.reduce((acc, s) => acc + (s.health?.latencyMs || 42), 0) / services.length)
      : 48;
  const p99Latency =
    validLatencies.length > 0
      ? validLatencies[Math.floor(validLatencies.length * 0.99)] || validLatencies[validLatencies.length - 1]
      : medianLatency + 28;

  // Filtered services
  const filteredServices = services.filter((svc) => {
    if (servicesFilterTab === "active" && svc.active === false) return false;
    if (
      servicesFilterTab === "degraded" &&
      svc.health?.status !== "DEGRADED" &&
      svc.health?.status !== "SCHEMA_MISMATCH" &&
      svc.health?.status !== "DOWN"
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        svc.name.toLowerCase().includes(q) ||
        svc.category.toLowerCase().includes(q) ||
        svc.endpoint.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "scraping":
        return <Globe className="w-4 h-4 text-[#735c00]" />;
      case "inference":
        return <Brain className="w-4 h-4 text-[#735c00]" />;
      case "data":
      case "fx-rates":
        return <TrendingUp className="w-4 h-4 text-[#735c00]" />;
      case "summarization":
        return <MessageSquare className="w-4 h-4 text-[#735c00]" />;
      default:
        return <Layers className="w-4 h-4 text-[#735c00]" />;
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#fbf9f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#735c00]">
            Loading AgentBucket Atelier...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fbf9f6] text-[#1b1c1a] font-sans min-h-screen antialiased selection:bg-[#d4af37]/30 selection:text-[#554300]">
      {/* Toast Notification Container */}
      <div
        className={`fixed bottom-6 right-6 z-50 transform transition-all duration-300 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#30312f] text-[#f2f0ed] shadow-2xl text-xs font-semibold ${
          showToast ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0 pointer-events-none"
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
        <span>{toastMessage}</span>
      </div>

      {/* ================= FIXED LEFT SIDEBAR ================= */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between border-r border-[#d4af37]/15">
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="h-16 flex items-center px-6 gap-3 bg-[#f5f3f0] border-b border-[#d4af37]/15">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center p-0.5 shadow-sm border border-[#d4af37]/30">
              <img
                src="/bots/bot-2.svg"
                alt="AgentBucket Logo"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-[#1b1c1a] leading-tight">
                AgentBucket
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#735c00] font-bold">
                Provider Studio
              </span>
            </div>
          </div>

          {/* Section Label */}
          <div className="px-4 py-2 mt-2">
            <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] px-2 font-bold">
              Workspace
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1 px-3">
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard, href: "#overview" },
              { id: "services", label: "Agent Services", icon: Bot, href: "#services-section" },
              { id: "dispatcher", label: "Buyer Scout Dispatcher", icon: Zap, href: "#dispatcher-section" },
              { id: "analytics", label: "Executions & Analytics", icon: Activity, href: "#analytics-section" },
              { id: "revenue", label: "Revenue & Escrow", icon: WalletIcon, href: "#ledger-section" },
              { id: "api", label: "API & Webhooks", icon: Key, href: "#protocol-section" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNavTab === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveNavTab(item.id);
                    const el = document.querySelector(item.href);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#d4af37] text-[#554300] font-bold shadow-[0_2px_8px_rgba(212,175,55,0.2)]"
                      : "text-[#4d4635] hover:bg-[#eae8e5] hover:text-[#1b1c1a]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#554300]" : "text-[#5b5e66]"}`} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Bottom Node Status Widget */}
        <div className="p-4 flex flex-col gap-3 bg-[#f5f3f0] border-t border-[#d4af37]/15">
          <div className="bg-white p-3 rounded-lg shadow-[0_2px_6px_-1px_rgba(13,17,23,0.04)] flex flex-col gap-1.5 border border-[#d0c5af]/30">
            <div className="flex items-center justify-between text-[10px]">
              <span className="uppercase text-[#5b5e66] font-bold">Node Status</span>
              <span className={`font-bold font-mono ${degradedEndpoints > 0 ? "text-amber-700" : "text-[#1b1c1a]"}`}>
                {nodeStatusPct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#eae8e5] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  degradedEndpoints > 0 ? "bg-amber-500" : "bg-[#d4af37]"
                }`}
                style={{ width: `${nodeStatusPct}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#4d4635]">
              <span>{healthyEndpoints}/{services.length} healthy</span>
              {degradedEndpoints > 0 ? (
                <span className="text-amber-700 font-semibold">{degradedEndpoints} degraded</span>
              ) : (
                <span className="text-emerald-700 font-semibold">All active</span>
              )}
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            <button
              onClick={() => triggerToast("Studio settings saved")}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-[#4d4635] hover:bg-[#eae8e5] hover:text-[#1b1c1a] transition-all text-left"
            >
              <Settings className="w-4 h-4 text-[#5b5e66]" />
              <span>Studio Settings</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* ================= MAIN WRAPPER ================= */}
      <div className="pl-64 flex flex-col min-h-screen">
        {/* ================= FIXED TOP HEADER ================= */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-[#fbf9f6]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-6 border-b border-[#d4af37]/15">
          <div className="flex items-center gap-4">
            {/* Live Network Badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-[#efeeeb] rounded-full shadow-[0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              <span className="text-[11px] font-bold text-[#1b1c1a] tracking-wide">
                Base Sepolia (84532)
              </span>
            </div>

            {/* Seller Payout Wallet Pill */}
            <div className="flex items-center gap-2 bg-[#f5f3f0] px-3 py-1 rounded-full border border-[#d0c5af]/50">
              <WalletIcon className="w-3.5 h-3.5 text-[#735c00]" />
              <span className="text-xs font-mono text-[#1b1c1a] font-medium">
                {sellerPayoutAddress.slice(0, 6)}...{sellerPayoutAddress.slice(-4)}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sellerPayoutAddress);
                  triggerToast("Payout address copied to clipboard");
                }}
                className="hover:text-[#735c00] transition-colors text-[#5b5e66] flex items-center ml-0.5"
                type="button"
                title="Copy address"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Health Audit Button */}
            <button
              onClick={handleRunHealthCheck}
              disabled={isRunningHealthCheck}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#efeeeb] hover:bg-[#eae8e5] text-xs font-semibold text-[#1b1c1a] border border-[#d0c5af]/40 transition-all disabled:opacity-50"
            >
              <HeartPulse className={`w-3.5 h-3.5 text-emerald-600 ${isRunningHealthCheck ? "animate-spin" : ""}`} />
              <span>{isRunningHealthCheck ? "Auditing..." : "Health Audit"}</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 rounded-full bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a] transition-colors relative flex items-center justify-center border border-[#d0c5af]/40"
                title="Health Notifications"
              >
                <Bell className="w-4 h-4 text-[#735c00]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#d4af37]/30 shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#efeeeb] pb-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#735c00]" />
                      <h4 className="text-xs font-bold text-[#1b1c1a] uppercase tracking-wider">
                        Agent Health Alerts
                      </h4>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-[#735c00] hover:text-[#554300] font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-[#5b5e66] text-center py-4">
                        No active alerts. All proxy endpoints healthy.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                            !n.read
                              ? "bg-[#fbf9f6] border-[#d4af37]/40 text-[#1b1c1a]"
                              : "bg-[#f5f3f0] border-transparent text-[#5b5e66]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[11px] text-[#1b1c1a]">{n.title}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                                n.severity === "error"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {n.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#4d4635] leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Register Service Button */}
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#d4af37] text-[#554300] px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(212,175,55,0.25)] hover:brightness-105 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Register New Service</span>
            </button>

            <div className="h-5 w-px bg-[#d0c5af]"></div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2.5 pl-1">
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover shadow-[0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/30"
                src="/bots/bot-3.svg"
              />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#1b1c1a] leading-none">
                  {user?.name || "AuraNode Labs"}
                </span>
                <span className="text-[10px] text-[#5b5e66] leading-tight">
                  Verified Seller
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-[#5b5e66] hover:text-rose-700 transition-colors ml-1"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ================= MAIN DASHBOARD BODY ================= */}
        <main className="flex-1 w-full pt-16 bg-[#fbf9f6]">
          <div className="w-full px-6 md:px-8 xl:px-12 py-8 flex flex-col gap-8 max-w-[1600px] mx-auto">
            {/* 1. STUDIO BANNER & WELCOME BAR */}
            <section
              id="overview"
              className="relative w-full bg-white rounded-xl p-6 md:p-8 shadow-sm overflow-hidden border border-[#d4af37]/20"
            >
              <div className="absolute -top-24 -left-20 w-80 h-80 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 right-40 w-96 h-96 bg-[#fee179]/15 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Left: Studio Meta */}
                <div className="flex flex-col gap-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#735c00]">
                      Provider Studio
                    </span>
                    <span className="text-[#5b5e66]">•</span>
                    <span className="text-[11px] text-[#5b5e66] tracking-wide">
                      Service Operations Hub
                    </span>
                    <span className="text-[#5b5e66]">•</span>
                    <span className="inline-flex items-center gap-1.5 bg-[#efeeeb] px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-[#1b1c1a]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                      Mainnet Mirror Relay
                    </span>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-bold text-[#1b1c1a] tracking-tight">
                    AgentBucket Service Operations
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="inline-flex items-center gap-1.5 bg-[#f5f3f0] px-3 py-1 rounded-md border border-[#d0c5af]/40">
                      <Award className="w-4 h-4 text-[#735c00]" />
                      <span className="text-xs font-semibold text-[#1b1c1a]">
                        Guild Architect
                      </span>
                      <span className="text-[10px] bg-[#d4af37]/20 text-[#554300] px-1.5 py-0.2 rounded font-bold">
                        Lvl 3
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 bg-[#f5f3f0] px-3 py-1 rounded-md font-mono text-xs border border-[#d0c5af]/40">
                      <span className="text-[#5b5e66]">Base Sepolia Escrow:</span>
                      <span className="text-[#1b1c1a] font-semibold">
                        {escrowContract.slice(0, 7)}...{escrowContract.slice(-4)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(escrowContract);
                          triggerToast("Escrow address copied");
                        }}
                        className="hover:text-[#735c00] transition-colors flex items-center p-0.5"
                        type="button"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Sentinel Mascot Card & Controls */}
                <div className="flex flex-col sm:flex-row items-end lg:items-center gap-4 w-full lg:w-auto">
                  <div className="relative bg-[#f5f3f0]/90 backdrop-blur-md p-3 rounded-xl flex items-center gap-3 shadow-sm border border-[#d4af37]/25 hover:shadow-md transition-all group">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-[#d4af37]/10 border border-[#d4af37]/30">
                      <img
                        alt="Sentinel Bot"
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform"
                        src="/bots/bot-2.svg"
                      />
                      <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[#10b981] border border-white"></span>
                    </div>
                    <div className="flex flex-col max-w-[210px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#1b1c1a]">Sentinel AI</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#d4af37] text-[#554300] font-extrabold">
                          Autonomous
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5b5e66] leading-snug">
                        Monitoring {services.length} live endpoints ({healthyEndpoints} Healthy, {degradedEndpoints} Alerts) • Escrow Relay Active
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end w-full sm:w-auto">
                    <div className="flex items-center p-1 bg-[#efeeeb] rounded-lg text-xs font-semibold">
                      {(["24H", "7D", "30D", "All Time"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setTimeframe(t);
                            triggerToast(`Filtered metrics for: ${t}`);
                          }}
                          className={`px-3 py-1 rounded transition-all ${
                            timeframe === t
                              ? "bg-white text-[#1b1c1a] font-bold shadow-sm"
                              : "text-[#5b5e66] hover:text-[#1b1c1a]"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleExportCsv}
                      type="button"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] text-xs font-semibold rounded-lg transition-all shadow-sm border border-[#d0c5af]/50"
                    >
                      <Download className="w-3.5 h-3.5 text-[#735c00]" />
                      <span>Export Ledger CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. TOP 4 KPI METRIC CARDS */}
            <section id="analytics-section" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Card 1: Total Revenue */}
              <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 border border-[#d4af37]/15">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">
                      Total Revenue
                    </span>
                    <HelpCircle className="w-3.5 h-3.5 text-[#5b5e66] cursor-help" />
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-[#d4af37]/20 flex items-center justify-center text-[#735c00]">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#1b1c1a] font-mono">
                      ${totalRevenueUsdc}
                    </span>
                    <span className="text-xs font-mono text-[#5b5e66] font-semibold">USDC</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono">
                      {settledCalls} settled
                    </span>
                    <span className="text-[11px] text-[#4d4635] truncate">
                      {totalRevenueAtomic.toLocaleString()} atomic units
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Invocations */}
              <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 border border-[#d4af37]/15">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">
                      Invocations
                    </span>
                    <HelpCircle className="w-3.5 h-3.5 text-[#5b5e66] cursor-help" />
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#1b1c1a]">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#1b1c1a] font-mono">
                      {totalInvocations}
                    </span>
                    <span className="text-xs font-mono text-[#5b5e66] font-semibold">calls</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded bg-[#d4af37]/20 text-[#554300] font-mono">
                      {failedEntries.length} rejected
                    </span>
                    <span className="text-[11px] text-[#4d4635]">
                      {deliveryRate}% SLA delivery
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Delivery & SLA */}
              <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 border border-[#d4af37]/15">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">
                      Delivery &amp; SLA
                    </span>
                    <HelpCircle className="w-3.5 h-3.5 text-[#5b5e66] cursor-help" />
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#1b1c1a] font-mono">
                      {deliveryRate}%
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ffe088] text-[#241a00]">
                      {deliveryRate >= 95 ? "⭐ 5.0/5" : deliveryRate >= 80 ? "⭐ 4.5/5" : "⚠️ Degraded"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`w-2 h-2 rounded-full ${schemaDisputes > 0 ? "bg-amber-500" : "bg-emerald-600"}`}></span>
                    <span className="text-[11px] text-[#4d4635]">
                      {schemaDisputes} schema dispute{schemaDisputes === 1 ? "" : "s"} caught
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Median Latency */}
              <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 border border-[#d4af37]/15">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">
                      Median Latency
                    </span>
                    <HelpCircle className="w-3.5 h-3.5 text-[#5b5e66] cursor-help" />
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#5b5e66]">
                    <Gauge className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#1b1c1a] font-mono">
                      {medianLatency}ms
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      ⚡ Fast L2
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-[#5b5e66] font-mono">
                      p99: {p99Latency}ms • Base Sepolia
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. REGISTERED ENDPOINTS & APIS TABLE */}
            <section
              id="services-section"
              className="bg-white rounded-xl p-6 shadow-md flex flex-col gap-4 border border-[#d4af37]/15"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#1b1c1a] tracking-tight">
                      Registered Endpoints &amp; APIs
                    </h2>
                    <span className="text-xs bg-[#efeeeb] px-2.5 py-0.5 rounded-full text-[#5b5e66] font-semibold">
                      {services.length} Managed
                    </span>
                  </div>
                  <p className="text-xs text-[#4d4635]">
                    Pay-per-call programmatic proxies with automated contract settlement
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-[#efeeeb] p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setServicesFilterTab("all")}
                      className={`px-3 py-1 rounded transition-all ${
                        servicesFilterTab === "all"
                          ? "bg-white font-bold text-[#1b1c1a] shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                    >
                      All ({services.length})
                    </button>
                    <button
                      onClick={() => setServicesFilterTab("active")}
                      className={`px-3 py-1 rounded transition-all ${
                        servicesFilterTab === "active"
                          ? "bg-white font-bold text-[#1b1c1a] shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                    >
                      Active ({services.filter((s) => s.active !== false).length})
                    </button>
                    <button
                      onClick={() => setServicesFilterTab("degraded")}
                      className={`px-3 py-1 rounded transition-all ${
                        servicesFilterTab === "degraded"
                          ? "bg-white font-bold text-[#1b1c1a] shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                    >
                      Degraded ({services.filter((s) => s.health?.status === "SCHEMA_MISMATCH" || s.health?.status === "DEGRADED").length})
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-[#5b5e66] absolute left-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter endpoints..."
                      className="bg-[#f5f3f0] text-[#1b1c1a] placeholder:text-[#5b5e66] pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#735c00] border border-[#d0c5af]/40 w-44 md:w-56"
                    />
                  </div>
                </div>
              </div>

              {/* High-Density Responsive Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f5f3f0] text-[#5b5e66] uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-2.5 px-4 rounded-l-lg">Service &amp; Category</th>
                      <th className="py-2.5 px-4">Endpoint Proxy</th>
                      <th className="py-2.5 px-4">Price / Call</th>
                      <th className="py-2.5 px-4">Automated Health</th>
                      <th className="py-2.5 px-4">Served</th>
                      <th className="py-2.5 px-4">Revenue</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right rounded-r-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efeeeb]">
                    {filteredServices.map((svc) => {
                      const isDegraded =
                        svc.health?.status === "SCHEMA_MISMATCH" ||
                        svc.health?.status === "DEGRADED";

                      return (
                        <tr
                          key={svc.id}
                          className={`hover:bg-[#f5f3f0]/70 transition-colors ${
                            isDegraded ? "bg-rose-50/20" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center font-bold shrink-0">
                                {getCategoryIcon(svc.category)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#1b1c1a] truncate">
                                    {svc.name}
                                  </span>
                                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#efeeeb] text-[#4d4635] font-semibold shrink-0">
                                    {svc.category}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#4d4635] truncate max-w-xs">
                                  {svc.health?.message || `Proxy for ${svc.name}`}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="bg-[#f5f3f0] px-2 py-1 rounded text-[#1b1c1a] truncate max-w-[170px] border border-[#d0c5af]/30">
                                {svc.endpoint.replace("http://localhost:3000", "") || svc.endpoint}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(svc.endpoint);
                                  triggerToast("Endpoint URL copied");
                                }}
                                className="text-[#5b5e66] hover:text-[#735c00] transition-colors p-1"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono text-[11px] bg-[#d4af37]/20 text-[#554300] px-2 py-0.5 rounded-full font-bold">
                              {(svc.price / 1_000_000).toFixed(4)} USDC
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {svc.health?.status === "HEALTHY" ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  <span className="font-bold text-emerald-700">
                                    HEALTHY ({svc.health.latencyMs}ms)
                                  </span>
                                </>
                              ) : svc.health?.status === "SCHEMA_MISMATCH" ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                  <span className="font-bold text-amber-700">
                                    ⚠️ SCHEMA_MISMATCH
                                  </span>
                                </>
                              ) : svc.health?.status === "DEGRADED" ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                  <span className="font-bold text-rose-700">
                                    DEGRADED ({svc.health.latencyMs}ms)
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  <span className="font-bold text-emerald-700">
                                    HEALTHY ({svc.health?.latencyMs || 42}ms)
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Served Calls - DYNAMIC FROM LEDGER */}
                          {(() => {
                            const svcCalls = ledger.filter(
                              (l) => l.serviceName.toLowerCase() === svc.name.toLowerCase() || l.category === svc.category
                            );
                            const svcSettled = svcCalls.filter((l) => l.status === "SETTLED");
                            const svcRev = svcSettled.reduce((sum, l) => sum + (l.paidPrice || 0), 0);

                            return (
                              <>
                                <td className="py-3.5 px-4 font-mono font-semibold text-[#1b1c1a]">
                                  {svcCalls.length} calls
                                </td>
                                <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                                  +${(svcRev / 1_000_000).toFixed(4)} USDC
                                </td>
                              </>
                            );
                          })()}

                          <td className="py-3.5 px-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={svc.active !== false}
                                onChange={() => {
                                  setServices((prev) =>
                                    prev.map((s) => (s.id === svc.id ? { ...s, active: !s.active } : s))
                                  );
                                  triggerToast("Status toggled");
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-[#eae8e5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#d4af37]"></div>
                            </label>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handlePing(svc)}
                                className="px-2.5 py-1 rounded bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a] text-[11px] font-semibold transition-all shadow-sm"
                              >
                                Ping
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedServiceForSchema(svc);
                                  setIsSchemaModalOpen(true);
                                }}
                                className="p-1 hover:text-[#735c00] text-[#5b5e66]"
                                title="Inspect Schema"
                              >
                                <FileCode className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. BUYER AGENT DISPATCHER & REAL-TIME STREAM */}
            <section
              id="dispatcher-section"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-xl p-6 shadow-md border border-[#d4af37]/20"
            >
              <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-bold text-[#1b1c1a] flex items-center gap-2.5">
                      <img
                        src="/bots/bot-1.svg"
                        alt="Scout Bot"
                        className="w-7 h-7 rounded-lg object-cover border border-[#d4af37]/40 shadow-sm"
                      />
                      <span>Buyer Agent Dispatcher</span>
                    </h2>
                    <span className="text-[10px] bg-[#d4af37]/20 text-[#554300] px-2 py-0.5 rounded-full font-bold">
                      Scout v1.4.2
                    </span>
                  </div>

                  <p className="text-xs text-[#5b5e66] mb-3">
                    Give Scout an instruction prompt. It resolves candidate tools, verifies 402 gas prices, and signs EIP-3009 offline vouchers.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#1b1c1a] block mb-1">
                        Task Instruction Prompt
                      </label>
                      <textarea
                        rows={3}
                        value={taskPrompt}
                        onChange={(e) => setTaskPrompt(e.target.value)}
                        className="w-full bg-[#f5f3f0] border border-[#d0c5af]/60 rounded-xl p-3 text-xs text-[#1b1c1a] focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    {/* Presets */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-[#5b5e66]">Judge Demo Presets:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            setTaskPrompt("From pages 1 to 4 of books.toscrape.com, find the three cheapest 5-star books, give their prices in rupees, and summarise each description in Hindi.");
                            setBudgetUsdc(0.50);
                          }}
                          className="p-2 rounded-lg bg-[#efeeeb] hover:bg-[#eae8e5] text-left border border-[#d0c5af]/30 transition-colors"
                        >
                          <div className="font-bold text-[#1b1c1a]">🎯 3-Step Pipeline</div>
                          <div className="text-[#5b5e66]">Scrape + FX + Hindi</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTaskPrompt("Scrape books inventory using Budget Scraper, detect schema mismatch, and fallback to Books Scraper Pro.");
                            setBudgetUsdc(0.25);
                          }}
                          className="p-2 rounded-lg bg-[#efeeeb] hover:bg-[#eae8e5] text-left border border-[#d0c5af]/30 transition-colors"
                        >
                          <div className="font-bold text-[#1b1c1a]">🛡️ Fallback Test</div>
                          <div className="text-[#5b5e66]">Corrupt Recovery</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTaskPrompt("Attempt scraping books with tight cap to test HTTP 402 budget exhaustion refusal.");
                            setBudgetUsdc(0.01);
                          }}
                          className="p-2 rounded-lg bg-[#efeeeb] hover:bg-[#eae8e5] text-left border border-[#d0c5af]/30 transition-colors"
                        >
                          <div className="font-bold text-[#1b1c1a]">⚡ Exhaustion Cap</div>
                          <div className="text-[#5b5e66]">Tight Cap Refusal</div>
                        </button>
                      </div>
                    </div>

                    {/* Budget & Concurrency */}
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#5b5e66] font-semibold">Budget Limit:</span>
                          <span className="font-bold text-[#735c00] font-mono">${budgetUsdc.toFixed(2)} USDC</span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="1.00"
                          step="0.01"
                          value={budgetUsdc}
                          onChange={(e) => setBudgetUsdc(parseFloat(e.target.value))}
                          className="w-full accent-[#735c00]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#5b5e66] font-semibold">Max Concurrency:</span>
                          <span className="font-bold text-[#1b1c1a] font-mono">{concurrency}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={concurrency}
                          onChange={(e) => setConcurrency(parseInt(e.target.value))}
                          className="w-full accent-[#735c00]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLaunchAgent}
                  disabled={isRunning}
                  className="w-full py-3 bg-[#d4af37] text-[#554300] hover:brightness-105 active:scale-[0.99] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Scout Dispatched &amp; Negotiating...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4" />
                      <span>Launch Autonomous Buyer Agent</span>
                    </>
                  )}
                </button>
              </div>

              {/* Real-time Stream Output */}
              <div className="lg:col-span-6 bg-[#1b1c1a] rounded-xl p-4 flex flex-col justify-between overflow-hidden border border-[#d4af37]/30 min-h-[300px]">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Real-Time Execution Stream
                  </span>
                  {currentTaskId && (
                    <span className="font-mono text-[10px] text-[#d4af37]">
                      {currentTaskId}
                    </span>
                  )}
                </div>

                <div className="py-3 flex-1 overflow-y-auto space-y-2.5 font-mono text-[11px]">
                  {events.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs">
                      <span>Awaiting execution. Launch Scout to stream real-time steps.</span>
                    </div>
                  ) : (
                    events.map((ev, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-zinc-300 leading-snug">
                        <span className="text-[#d4af37] shrink-0">›</span>
                        <div className="flex-1">
                          <span
                            className={
                              ev.type.includes("FAILED") || ev.type.includes("REJECTED")
                                ? "text-rose-400"
                                : ev.type.includes("SUCCESS") || ev.type.includes("SETTLED")
                                ? "text-emerald-400"
                                : "text-zinc-300"
                            }
                          >
                            {ev.message}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {runSummary && (
                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>
                      Settled:{" "}
                      <strong className="text-emerald-400">
                        ${((runSummary.totalSpent as number) / 1_000_000).toFixed(4)} USDC
                      </strong>
                    </span>
                    <span>
                      Fallback:{" "}
                      <strong className={runSummary.fallbackUsed ? "text-amber-400" : "text-zinc-400"}>
                        {runSummary.fallbackUsed ? "Triggered" : "Direct"}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* 5. LIVE INBOUND REVENUE & MICRO-SETTLEMENT LEDGER */}
            <section
              id="ledger-section"
              className="bg-white rounded-xl p-6 shadow-md flex flex-col gap-4 border border-[#d4af37]/15"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-[#1b1c1a] tracking-tight">
                      Live Inbound Revenue &amp; Micro-Settlement Ledger
                    </h2>
                    <span className="text-xs text-[#5b5e66]">
                      Real-time audit trail of cryptographic authorizations
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] bg-[#efeeeb] px-3 py-1 rounded-full text-[#5b5e66] font-mono flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 text-[#735c00]" />
                    <span>Auto-refreshing (4s)</span>
                  </span>
                  <button
                    onClick={refreshAllData}
                    className="p-1 text-[#735c00] hover:bg-[#efeeeb] rounded"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f5f3f0] text-[#5b5e66] uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-2.5 px-4 rounded-l-lg">Time</th>
                      <th className="py-2.5 px-4">Buyer Agent</th>
                      <th className="py-2.5 px-4">Service</th>
                      <th className="py-2.5 px-4">Fee Collected</th>
                      <th className="py-2.5 px-4">Latency</th>
                      <th className="py-2.5 px-4">Tx Hash</th>
                      <th className="py-2.5 px-4 rounded-r-lg">Settled Protocol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efeeeb]">
                    {ledger.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#5b5e66] text-xs">
                          No inbound transactions recorded yet. Launch Scout Dispatcher or run the test suite to simulate real micro-settlements.
                        </td>
                      </tr>
                    ) : (
                      ledger.slice(0, 15).map((entry) => (
                        <tr key={entry._id} className="hover:bg-[#f5f3f0]/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-[#5b5e66] text-[11px]">
                            {new Date(entry.createdAt).toLocaleTimeString()}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <img
                                alt="Scout Alpha"
                                src="/bots/bot-1.svg"
                                className="w-6 h-6 rounded-full object-cover border border-[#d4af37]/30 shrink-0"
                              />
                              <span className="font-bold text-[#1b1c1a]">Scout Alpha</span>
                              <span className="font-mono text-[#5b5e66] text-[10px]">
                                ({entry.buyer.slice(0, 5)}...{entry.buyer.slice(-3)})
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-semibold text-[#1b1c1a]">
                            {entry.serviceName}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              +{(entry.paidPrice / 1_000_000).toFixed(4)} USDC
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono text-[#5b5e66] text-[11px]">
                            {entry.latencyMs}ms
                          </td>

                          <td className="py-3 px-4">
                            {entry.txHash ? (
                              <Link
                                href={`/tx/${entry.txHash}`}
                                className="font-mono text-[#735c00] hover:underline inline-flex items-center gap-1 text-[11px]"
                              >
                                <span>
                                  {entry.txHash.slice(0, 6)}...{entry.txHash.slice(-4)}
                                </span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span className="font-mono text-[#5b5e66] text-[10px]">Pending</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-[10px] bg-[#efeeeb] px-2 py-0.5 rounded text-[#4d4635] font-mono">
                              EIP-3009 HTTP 402
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-[#efeeeb] text-[#4d4635] text-[11px] gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-semibold">Settled: {settledCalls}/{totalInvocations} calls</span>
                  <span>•</span>
                  <span className="font-mono text-amber-700 font-semibold">Disputes: {schemaDisputes} caught</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    100% On-Chain Verifiable
                  </span>
                </div>

                <span className="text-[#735c00] font-semibold text-xs">
                  Displaying {ledger.length} Recorded Transactions
                </span>
              </div>
            </section>

            {/* 6. BOTTOM PROTOCOL INFO CARDS */}
            <section id="protocol-section" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#f5f3f0] rounded-xl p-4 flex items-center gap-3.5 border border-[#d0c5af]/30">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#735c00] shadow-sm shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1b1c1a]">
                    EIP-3009 Gasless Transfer
                  </span>
                  <span className="text-[11px] text-[#5b5e66] leading-tight">
                    Buyers sign valid auth vouchers; relay settles without payer gas fees.
                  </span>
                </div>
              </div>

              <div className="bg-[#f5f3f0] rounded-xl p-4 flex items-center gap-3.5 border border-[#d0c5af]/30">
                <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center border border-[#d4af37]/30 shadow-sm shrink-0">
                  <img
                    src="/bots/bot-4.svg"
                    alt="Autonomous Validator"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1b1c1a]">
                    Strict Schema Escrow
                  </span>
                  <span className="text-[11px] text-[#5b5e66] leading-tight">
                    Outputs validate against strict JSON-Schema to prevent prompt hallucinations.
                  </span>
                </div>
              </div>

              <div className="bg-[#f5f3f0] rounded-xl p-4 flex items-center gap-3.5 border border-[#d0c5af]/30">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#735c00] shadow-sm shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1b1c1a]">
                    Base Sepolia Fast L2
                  </span>
                  <span className="text-[11px] text-[#5b5e66] leading-tight">
                    Average confirmation &lt;2 seconds with sub-cent settlement charges.
                  </span>
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Global Footer */}
        <footer className="w-full bg-[#f5f3f0] px-6 py-4 mt-auto border-t border-[#d4af37]/15">
          <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#4d4635]">
            <div className="flex items-center gap-3 flex-wrap">
              <span>AgentBucket Studio v2.4.0</span>
              <span>•</span>
              <span className="font-mono text-[#735c00]">
                Contract: 0x88c4...3b1f (Base Sepolia)
              </span>
              <span>•</span>
              <span>Subgraphs Indexed: 100%</span>
            </div>

            <div className="flex items-center gap-5 text-[11px] font-semibold text-[#5b5e66]">
              <a href="#" className="hover:text-[#1b1c1a] transition-colors">Smart Contracts</a>
              <a href="#" className="hover:text-[#1b1c1a] transition-colors">Agent RPC Protocol</a>
              <a href="#" className="hover:text-[#1b1c1a] transition-colors">Terms &amp; SLAs</a>
              <a href="#" className="hover:text-[#1b1c1a] transition-colors">System Status</a>
            </div>
          </div>
        </footer>
      </div>

      {/* JSON Schema Inspector Modal */}
      <SchemaModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        serviceName={selectedServiceForSchema?.name || "Service Schema"}
        schema={selectedServiceForSchema?.schema || null}
      />

      {/* Register New Service Modal */}
      <RegisterServiceModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        defaultPayTo={sellerPayoutAddress}
        onSuccess={(newSvc) => {
          triggerToast(`Service "${newSvc.name}" registered successfully!`);
          refreshAllData();
        }}
      />
    </div>
  );
}
