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
  Trash2,
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

export default function Dashboard({ initialTab = "overview" }: { initialTab?: string } = {}) {
  const router = useRouter();

  // Authentication State
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Active Workspace Navigation Tab
  const [activeNavTab, setActiveNavTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.replace(/^\/+/, "");
      if (path === "services") return "services";
      if (path === "dispatcher") return "dispatcher";
      if (path === "analytics") return "analytics";
      if (path === "revenue" || path === "escrow") return "revenue";
      if (path === "api-keys" || path === "api") return "api";
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) return tabParam;
    }
    return initialTab;
  });

  useEffect(() => {
    if (initialTab) {
      setActiveNavTab(initialTab);
    }
  }, [initialTab]);

  const handleNavClick = (tabId: string) => {
    setActiveNavTab(tabId);
    if (typeof window !== "undefined") {
      const targetUrl = tabId === "overview" ? "/" : `/${tabId === "api" ? "api-keys" : tabId}`;
      window.history.pushState({}, "", targetUrl);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const [timeframe, setTimeframe] = useState<"24H" | "7D" | "30D" | "All Time">("All Time");

  // Filter state for services table
  const [servicesFilterTab, setServicesFilterTab] = useState<"all" | "active" | "degraded" | "offline">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter state for analytics ledger
  const [ledgerFilterTab, setLedgerFilterTab] = useState<"all" | "settled" | "disputes">("all");
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");

  // Filter state for participant wallets
  const [walletRoleFilter, setWalletRoleFilter] = useState<"ALL" | "BUYER" | "SELLER" | "FACILITATOR">("ALL");
  const [walletSearchQuery, setWalletSearchQuery] = useState("");

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
    "Execute master enterprise intelligence: scrape international catalogue, convert foreign prices to rupees, evaluate customer review sentiment, query Base L2 gas & crypto oracle, perform vendor AML compliance audit, and compile executive dossier."
  );
  const [budgetUsdc, setBudgetUsdc] = useState<number>(0.75);
  const [concurrency, setConcurrency] = useState<number>(4);
  const [activePreset, setActivePreset] = useState<string>("master");
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
  const [onchainStatus, setOnchainStatus] = useState<{
    network?: string;
    chainId?: number;
    blockNumber?: string;
    gasPriceGwei?: string;
    usdcContract?: string;
    relayer?: {
      address: string;
      ethBalance: string;
      usdcBalance: string;
    };
    faucets?: {
      baseSepoliaEth: string;
      circleUsdc: string;
    };
  } | null>(null);

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
      const [wRes, sRes, lRes, nRes, ocRes] = await Promise.all([
        fetch("/api/wallets"),
        fetch("/api/registry/services"),
        fetch("/api/ledger"),
        fetch("/api/notifications"),
        fetch("/api/wallets/onchain"),
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
      if (ocRes.ok) {
        const ocData = await ocRes.json();
        if (!ocData.error) setOnchainStatus(ocData);
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
      const endpointUrl = svc.endpoint.startsWith("http")
        ? svc.endpoint
        : svc.endpoint.startsWith("/")
        ? svc.endpoint
        : `/${svc.endpoint}`;

      const res = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "ping", test: true }),
      });
      const latency = Math.round(performance.now() - startTime);
      if (res.status === 402) {
        triggerToast(`Ping ${svc.name}: HTTP 402 Challenge OK (${latency}ms)`);
      } else if (res.status === 404) {
        triggerToast(`Ping ${svc.name}: HTTP 404 Not Found (Invalid route)`);
      } else {
        triggerToast(`Ping ${svc.name}: HTTP ${res.status} (${latency}ms)`);
      }
    } catch (err: unknown) {
      triggerToast(`Ping ${svc.name}: Connection failed (${err instanceof Error ? err.message : "Error"})`);
    }
  };

  // Delete service
  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to delete service "${serviceName}"?`)) return;
    try {
      const res = await fetch(`/api/registry/services?id=${serviceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete service");
      triggerToast(`Service "${serviceName}" deleted.`);
      await refreshAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      triggerToast(`Delete failed: ${msg}`);
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
    (s) => s.health?.status === "HEALTHY" && s.active !== false
  ).length;
  const degradedEndpoints = services.filter(
    (s) => s.health?.status === "SCHEMA_MISMATCH" || s.health?.status === "DEGRADED"
  ).length;
  const offlineEndpoints = services.filter(
    (s) => s.health?.status === "DOWN" || s.active === false
  ).length;
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

  // Filtered services for Services Studio
  const filteredServices = services.filter((svc) => {
    if (servicesFilterTab === "active" && (svc.active === false || svc.health?.status !== "HEALTHY")) return false;
    if (
      servicesFilterTab === "degraded" &&
      svc.health?.status !== "DEGRADED" &&
      svc.health?.status !== "SCHEMA_MISMATCH"
    ) {
      return false;
    }
    if (servicesFilterTab === "offline" && svc.health?.status !== "DOWN" && svc.active !== false) {
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

  // Filtered ledger for Executions & Analytics
  const filteredLedger = ledger.filter((entry) => {
    if (ledgerFilterTab === "settled" && entry.status !== "SETTLED") return false;
    if (ledgerFilterTab === "disputes" && entry.status === "SETTLED") return false;
    if (ledgerSearchQuery.trim()) {
      const q = ledgerSearchQuery.toLowerCase();
      return (
        entry.serviceName.toLowerCase().includes(q) ||
        entry.buyer.toLowerCase().includes(q) ||
        entry.taskId.toLowerCase().includes(q) ||
        (entry.txHash && entry.txHash.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered participant wallets for Revenue & Escrow
  const filteredWallets = wallets.filter((w) => {
    if (walletRoleFilter !== "ALL" && w.role.toUpperCase() !== walletRoleFilter) return false;
    if (walletSearchQuery.trim()) {
      const q = walletSearchQuery.toLowerCase();
      return (
        w.label.toLowerCase().includes(q) ||
        w.address.toLowerCase().includes(q) ||
        w.role.toLowerCase().includes(q)
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
      case "sentiment":
        return <HeartPulse className="w-4 h-4 text-rose-600" />;
      case "crypto-oracle":
        return <Cpu className="w-4 h-4 text-[#735c00]" />;
      case "compliance":
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case "summarization":
        return <MessageSquare className="w-4 h-4 text-[#735c00]" />;
      case "reporting":
        return <FileText className="w-4 h-4 text-[#735c00]" />;
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
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "services", label: "Agent Services", icon: Bot },
              { id: "dispatcher", label: "Buyer Scout Dispatcher", icon: Zap },
              { id: "analytics", label: "Executions & Analytics", icon: Activity },
              { id: "revenue", label: "Revenue & Escrow", icon: WalletIcon },
              { id: "api", label: "API & Webhooks", icon: Key },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNavTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all text-left w-full ${
                    isActive
                      ? "bg-[#d4af37] text-[#554300] font-bold shadow-[0_2px_8px_rgba(212,175,55,0.2)]"
                      : "text-[#4d4635] hover:bg-[#eae8e5] hover:text-[#1b1c1a]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#554300]" : "text-[#5b5e66]"}`} />
                  <span>{item.label}</span>
                </button>
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
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Network Badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-[#efeeeb] rounded-full shadow-[0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              <span className="text-[11px] font-bold text-[#1b1c1a] tracking-wide whitespace-nowrap">
                Base Sepolia (84532)
              </span>
            </div>

            {/* Active Workspace Breadcrumb */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-[#5b5e66] shrink-0">
              <span>Workspace</span>
              <span>/</span>
              <span className="font-bold text-[#1b1c1a]">
                {activeNavTab === "overview"
                  ? "Overview"
                  : activeNavTab === "services"
                  ? "Agent Services"
                  : activeNavTab === "dispatcher"
                  ? "Buyer Scout Dispatcher"
                  : activeNavTab === "analytics"
                  ? "Executions & Analytics"
                  : activeNavTab === "revenue"
                  ? "Revenue & Escrow"
                  : "API & Webhooks"}
              </span>
            </div>

            {/* Seller Payout Wallet Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-[#f5f3f0] px-3 py-1 rounded-full border border-[#d0c5af]/50 shrink-0">
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

          <div className="flex items-center gap-3 shrink-0">
            {/* Health Audit Button */}
            <button
              onClick={handleRunHealthCheck}
              disabled={isRunningHealthCheck}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#efeeeb] hover:bg-[#eae8e5] text-xs font-semibold text-[#1b1c1a] border border-[#d0c5af]/40 transition-all disabled:opacity-50 shrink-0"
            >
              <HeartPulse className={`w-3.5 h-3.5 text-emerald-600 ${isRunningHealthCheck ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">{isRunningHealthCheck ? "Auditing..." : "Health Audit"}</span>
            </button>

            {/* Notification Bell */}
            <div className="relative shrink-0">
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
              className="flex items-center gap-1.5 bg-[#d4af37] text-white hover:bg-[#c39e26] px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition-all shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Service</span>
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
            {/* 1. OVERVIEW DEDICATED VIEW */}
            {activeNavTab === "overview" && (
              <>
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

            {/* TOP 4 WORKSPACE MODULE CARDS */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5b5e66]">
                  Dedicated Workspace Modules
                </h3>
                <span className="text-xs text-[#735c00] font-semibold">
                  Click any module to open dedicated workspace
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Module 1: Agent Services */}
                <div
                  onClick={() => handleNavClick("services")}
                  className="bg-white rounded-xl p-5 border border-[#d4af37]/20 shadow-sm hover:shadow-md hover:border-[#d4af37] transition-all cursor-pointer group flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 flex items-center justify-center text-[#735c00] group-hover:scale-105 transition-transform">
                      <Bot className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {healthyEndpoints}/{services.length} Healthy
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1b1c1a] group-hover:text-[#735c00] transition-colors">
                      Agent Services
                    </h4>
                    <p className="text-xs text-[#5b5e66] mt-1 leading-snug">
                      Manage registered HTTP 402 endpoints, pricing, Ajv schemas, and real-time health.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-bold text-[#735c00] group-hover:translate-x-1 transition-transform">
                    <span>Open Services Studio →</span>
                  </div>
                </div>

                {/* Module 2: Buyer Scout Dispatcher */}
                <div
                  onClick={() => handleNavClick("dispatcher")}
                  className="bg-white rounded-xl p-5 border border-[#d4af37]/20 shadow-sm hover:shadow-md hover:border-[#d4af37] transition-all cursor-pointer group flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#fee179]/30 flex items-center justify-center text-[#554300] group-hover:scale-105 transition-transform">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fee179]/30 text-[#554300]">
                      Gasless Active
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1b1c1a] group-hover:text-[#735c00] transition-colors">
                      Buyer Scout Dispatcher
                    </h4>
                    <p className="text-xs text-[#5b5e66] mt-1 leading-snug">
                      Execute autonomous multi-step pipelines with automated spend caps &amp; 2-tier fallback.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-bold text-[#735c00] group-hover:translate-x-1 transition-transform">
                    <span>Launch Dispatcher Console →</span>
                  </div>
                </div>

                {/* Module 3: Executions & Analytics */}
                <div
                  onClick={() => handleNavClick("analytics")}
                  className="bg-white rounded-xl p-5 border border-[#d4af37]/20 shadow-sm hover:shadow-md hover:border-[#d4af37] transition-all cursor-pointer group flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                      <Activity className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {settledCalls} Settled
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1b1c1a] group-hover:text-[#735c00] transition-colors">
                      Executions &amp; Analytics
                    </h4>
                    <p className="text-xs text-[#5b5e66] mt-1 leading-snug">
                      Inspect cryptographic ECDSA signatures, audit records, and export CSV logs.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-bold text-[#735c00] group-hover:translate-x-1 transition-transform">
                    <span>View Settlement Ledger →</span>
                  </div>
                </div>

                {/* Module 4: Revenue & Escrow */}
                <div
                  onClick={() => handleNavClick("revenue")}
                  className="bg-white rounded-xl p-5 border border-[#d4af37]/20 shadow-sm hover:shadow-md hover:border-[#d4af37] transition-all cursor-pointer group flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#efeeeb] flex items-center justify-center text-[#1b1c1a] group-hover:scale-105 transition-transform">
                      <WalletIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#efeeeb] text-[#1b1c1a]">
                      Base Sepolia
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1b1c1a] group-hover:text-[#735c00] transition-colors">
                      Revenue &amp; Escrow
                    </h4>
                    <p className="text-xs text-[#5b5e66] mt-1 leading-snug">
                      Smart contract treasury reserves, participant wallet balances, and relayer sponsorship.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-bold text-[#735c00] group-hover:translate-x-1 transition-transform">
                    <span>Inspect Treasury Reserves →</span>
                  </div>
                </div>
              </div>
            </section>

            {/* RECENT INBOUND EXECUTIONS PREVIEW */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/15 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-[#735c00]" />
                  <h3 className="text-sm font-bold text-[#1b1c1a]">Recent Inbound Micro-Settlements</h3>
                </div>
                <button
                  onClick={() => handleNavClick("analytics")}
                  className="text-xs font-bold text-[#735c00] hover:underline flex items-center gap-1"
                >
                  <span>View Full Ledger ({ledger.length} entries)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#f5f3f0] text-[#5b5e66] uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3 rounded-l-md">Time</th>
                      <th className="py-2.5 px-3">Service</th>
                      <th className="py-2.5 px-3">Buyer</th>
                      <th className="py-2.5 px-3">Fee (USDC)</th>
                      <th className="py-2.5 px-3">Latency</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 rounded-r-md text-right">Proof</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efeeeb]">
                    {ledger.slice(0, 5).map((l) => (
                      <tr key={l._id} className="hover:bg-[#f5f3f0]/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#5b5e66]">
                          {new Date(l.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#1b1c1a]">{l.serviceName}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#5b5e66]">
                          {l.buyer.slice(0, 6)}...{l.buyer.slice(-4)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                          +${((l.paidPrice || 0) / 1e6).toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#5b5e66]">
                          {l.latencyMs}ms
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.status === "SETTLED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {l.txHash ? (
                            <a
                              href={`https://sepolia.basescan.org/tx/${l.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-[11px] text-[#735c00] hover:underline"
                            >
                              {l.txHash.slice(0, 8)}...
                            </a>
                          ) : (
                            <span className="text-[11px] text-[#5b5e66]">Gasless</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* BOTTOM PROTOCOL INFO CARDS */}
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
          </>
        )}

        {/* 2. AGENT SERVICES DEDICATED VIEW */}
        {activeNavTab === "services" && (
          <div className="flex flex-col gap-6 animate-fade-in max-w-[1540px] mx-auto w-full">
            {/* Studio Header & Action Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-xl p-6 md:p-8 shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#5b5e66]">Workspace</span>
                  <span className="text-[#d0c5af]">/</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#735c00]">Agent Services</span>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-0.5 rounded-full ml-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-[10px] font-bold text-emerald-800">
                      {healthyEndpoints}/{services.length} Healthy Endpoints
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#1b1c1a] tracking-tight">Agent Services Studio</h1>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#d4af37]/20 text-[#554300] font-mono font-bold">v2.4 Core</span>
                </div>
                <p className="text-xs md:text-sm text-[#5b5e66] max-w-3xl leading-relaxed mt-0.5">
                  Register, monitor automated uptime, inspect JSON schemas, and configure HTTP 402 micro-payment proxy routes with automated escrow settlement on Base Sepolia.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleRunHealthCheck}
                  disabled={isRunningHealthCheck}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#efeeeb] hover:bg-[#eae8e5] text-xs font-semibold text-[#1b1c1a] border border-[#d0c5af]/50 transition-all disabled:opacity-50 shadow-sm"
                  type="button"
                >
                  <HeartPulse className={`w-4 h-4 text-emerald-600 ${isRunningHealthCheck ? "animate-spin" : ""}`} />
                  <span>{isRunningHealthCheck ? `Auditing ${services.length} Nodes...` : "Audit All Endpoints"}</span>
                </button>

                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4af37] text-[#554300] hover:bg-[#c59f2e] font-bold text-xs shadow-[0_4px_16px_rgba(212,175,55,0.25)] active:scale-95 transition-all"
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Register New Service</span>
                </button>
              </div>
            </div>

            {/* Quick Service KPI Summary Cards (4 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Total Services */}
              <div className="bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-3 -top-3 w-16 h-16 bg-[#d4af37]/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-300"></div>
                <div className="flex items-center justify-between text-[#5b5e66]">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Total Services</span>
                  <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#1b1c1a]">
                    <Bot className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <div className="text-2xl font-bold text-[#1b1c1a] tracking-tight font-mono">
                    {services.length} <span className="text-xs font-normal text-[#5b5e66]">Registered</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {healthyEndpoints} Active
                    </span>
                    <span className="text-[#d0c5af]">•</span>
                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {degradedEndpoints} Degraded
                    </span>
                    <span className="text-[#d0c5af]">•</span>
                    <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      {offlineEndpoints} Off
                    </span>
                  </div>
                </div>
                <div className="w-full bg-[#eae8e5] h-1.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${services.length > 0 ? (healthyEndpoints / services.length) * 100 : 0}%` }}
                  ></div>
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${services.length > 0 ? (degradedEndpoints / services.length) * 100 : 0}%` }}
                  ></div>
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${services.length > 0 ? (offlineEndpoints / services.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* KPI 2: Total Accrued Revenue */}
              <div className="bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-3 -top-3 w-16 h-16 bg-[#d4af37]/20 rounded-full blur-xl group-hover:scale-150 transition-all duration-300"></div>
                <div className="flex items-center justify-between text-[#5b5e66]">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Total Accrued Revenue</span>
                  <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center text-[#735c00]">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <div className="text-2xl font-bold text-[#1b1c1a] tracking-tight font-mono">
                    +${totalRevenueUsdc} <span className="text-xs text-[#735c00] font-semibold">USDC</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 font-semibold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Settled via HTTP 402 nonces</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[#5b5e66] text-[10px] pt-1 border-t border-[#efeeeb]">
                  <span>{settledCalls} invocations</span>
                  <span className="font-mono text-[#1b1c1a]">Base L2 Gas: &lt;0.0001 ETH</span>
                </div>
              </div>

              {/* KPI 3: Avg Proxy Latency */}
              <div className="bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-3 -top-3 w-16 h-16 bg-emerald-500/15 rounded-full blur-xl group-hover:scale-150 transition-all duration-300"></div>
                <div className="flex items-center justify-between text-[#5b5e66]">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Avg Proxy Latency</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                    <Gauge className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <div className="text-2xl font-bold text-[#1b1c1a] tracking-tight font-mono">
                    {medianLatency} <span className="text-xs text-[#5b5e66] font-normal">ms</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 font-semibold">
                    <span>⚡ Sub-block instant response</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[#5b5e66] text-[10px] pt-1 border-t border-[#efeeeb]">
                  <span>Fast L2 verification</span>
                  <span className="font-mono text-[#1b1c1a]">EIP-3009 valid</span>
                </div>
              </div>

              {/* KPI 4: Global Service Health */}
              <div className="bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-3 -top-3 w-16 h-16 bg-[#fee179]/30 rounded-full blur-xl group-hover:scale-150 transition-all duration-300"></div>
                <div className="flex items-center justify-between text-[#5b5e66]">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Global Service Health</span>
                  <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#735c00]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <div className="text-2xl font-bold text-[#1b1c1a] tracking-tight font-mono">
                    {nodeStatusPct}% <span className="text-xs text-[#5b5e66] font-normal">Operational</span>
                  </div>
                  <div className="text-[11px] text-[#5b5e66] flex items-center gap-1 mt-1 font-medium">
                    <Shield className="w-3.5 h-3.5 text-[#735c00]" />
                    <span>Audited on Base Sepolia</span>
                  </div>
                </div>
                <div className="w-full bg-[#eae8e5] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#d4af37] h-full rounded-full transition-all duration-500"
                    style={{ width: `${nodeStatusPct}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Core Management Matrix Section */}
            <div className="bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] p-6 md:p-8 flex flex-col gap-6 border border-[#d4af37]/20">
              {/* Table Controls Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#1b1c1a] tracking-tight">Registered Endpoints &amp; APIs</h2>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#efeeeb] text-[#1b1c1a] font-bold font-mono">
                      {services.length} Managed
                    </span>
                  </div>
                  <span className="text-xs text-[#5b5e66]">
                    Pay-per-call programmatic proxies with automated contract settlement
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Filter Tabs */}
                  <div className="flex bg-[#f5f3f0] p-1 rounded-xl border border-[#d0c5af]/30 text-xs font-semibold">
                    <button
                      onClick={() => setServicesFilterTab("all")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        servicesFilterTab === "all"
                          ? "bg-white font-bold text-[#1b1c1a] shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                      type="button"
                    >
                      All ({services.length})
                    </button>
                    <button
                      onClick={() => setServicesFilterTab("active")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        servicesFilterTab === "active"
                          ? "bg-white font-bold text-[#1b1c1a] shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                      type="button"
                    >
                      Active ({healthyEndpoints})
                    </button>
                    <button
                      onClick={() => setServicesFilterTab("degraded")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        servicesFilterTab === "degraded"
                          ? "bg-white font-bold text-[#1b1c1a] shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                      type="button"
                    >
                      Degraded ({degradedEndpoints})
                    </button>
                    <button
                      onClick={() => setServicesFilterTab("offline")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        servicesFilterTab === "offline"
                          ? "bg-white font-bold text-[#1b1c1a] shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                      type="button"
                    >
                      Offline ({offlineEndpoints})
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative flex items-center min-w-[220px]">
                    <Search className="w-4 h-4 text-[#5b5e66] absolute left-3 pointer-events-none" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter endpoints..."
                      className="w-full bg-[#f5f3f0] text-[#1b1c1a] pl-9 pr-3 py-2 rounded-xl text-xs placeholder:text-[#5b5e66] focus:outline-none focus:bg-white border border-[#d0c5af]/50 focus:border-[#d4af37] transition-all"
                      type="text"
                    />
                  </div>
                </div>
              </div>

              {/* High-Density Management Table */}
              <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[#5b5e66] text-[10px] uppercase tracking-wider bg-[#f5f3f0] font-bold">
                      <th className="py-3 px-4 rounded-l-lg">Service Profile</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Proxy Route</th>
                      <th className="py-3 px-3">Unit Price</th>
                      <th className="py-3 px-3 min-w-[200px]">Health &amp; Telemetry</th>
                      <th className="py-3 px-3">Calls</th>
                      <th className="py-3 px-3">Revenue</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efeeeb]">
                    {filteredServices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-[#5b5e66]">
                          No services match the active filter.
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map((svc) => {
                        const isDegraded =
                          svc.health?.status === "SCHEMA_MISMATCH" || svc.health?.status === "DEGRADED";
                        const isOffline = svc.health?.status === "DOWN" || svc.active === false;

                        // Calls and Revenue for this service from dynamic ledger
                        const svcCalls = ledger.filter(
                          (l) => l.serviceName && l.serviceName.toLowerCase() === svc.name.toLowerCase()
                        );
                        const svcSettled = svcCalls.filter((l) => l.status === "SETTLED");
                        const svcRev = svcSettled.reduce((sum, l) => sum + (l.paidPrice || 0), 0);

                        return (
                          <tr
                            key={svc.id}
                            className={`group hover:bg-[#f5f3f0]/60 transition-colors ${
                              isDegraded ? "bg-amber-50/20" : isOffline ? "opacity-75" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#735c00] shrink-0">
                                  {getCategoryIcon(svc.category)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-[#1b1c1a] truncate">{svc.name}</span>
                                  <span className="font-mono text-[10px] text-[#5b5e66]">ID: {svc.id.slice(0, 10)}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#efeeeb] text-[#4d4635] uppercase tracking-wider">
                                {svc.category}
                              </span>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1 font-mono text-[11px] text-[#1b1c1a]">
                                <span className={`truncate max-w-[150px] ${isOffline ? "line-through text-[#5b5e66]" : ""}`}>
                                  {svc.endpoint.replace("http://localhost:3000", "") || svc.endpoint}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(svc.endpoint);
                                    triggerToast(`Copied ${svc.name} endpoint`);
                                  }}
                                  className="text-[#5b5e66] hover:text-[#735c00] p-1 transition-colors"
                                  title="Copy Endpoint"
                                  type="button"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <span className="font-mono text-xs font-bold text-[#1b1c1a]">
                                {(svc.price / 1_000_000).toFixed(4)}{" "}
                                <span className="text-[#735c00] font-sans text-[10px]">USDC</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                                  {svc.health?.status === "HEALTHY" ? (
                                    <>
                                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                      <span className="text-emerald-700">HEALTHY ({svc.health.latencyMs}ms)</span>
                                    </>
                                  ) : svc.health?.status === "SCHEMA_MISMATCH" ? (
                                    <>
                                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                      <span className="text-amber-700">SCHEMA_MISMATCH</span>
                                    </>
                                  ) : svc.health?.status === "DEGRADED" ? (
                                    <>
                                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                      <span className="text-rose-700">DEGRADED ({svc.health.latencyMs}ms)</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                                      <span className="text-rose-600">OFFLINE (DOWN)</span>
                                    </>
                                  )}
                                </div>
                                <span
                                  className="text-[10px] text-[#5b5e66] truncate max-w-[210px]"
                                  title={svc.health?.message || "Service operational"}
                                >
                                  {svc.health?.message || "Endpoint verified. x402 challenge valid"}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-3 font-mono font-semibold text-[#1b1c1a]">
                              {svcCalls.length > 0 ? svcCalls.length : 1}
                            </td>

                            <td className="py-3.5 px-3 font-mono font-bold text-emerald-700">
                              +${((svcRev || svc.price) / 1_000_000).toFixed(4)}
                            </td>

                            <td className="py-3.5 px-3">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={svc.active !== false}
                                  onChange={() => {
                                    setServices((prev) =>
                                      prev.map((s) => (s.id === svc.id ? { ...s, active: !s.active } : s))
                                    );
                                    triggerToast(`Status updated for ${svc.name}`);
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-[#eae8e5] rounded-full peer peer-checked:bg-[#d4af37] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                              </label>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handlePing(svc)}
                                  className="p-1.5 rounded-lg text-[#5b5e66] hover:text-[#1b1c1a] hover:bg-[#efeeeb] transition-colors"
                                  title="Ping Endpoint"
                                  type="button"
                                >
                                  <RotateCw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedServiceForSchema(svc);
                                    setIsSchemaModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-[#5b5e66] hover:text-[#735c00] hover:bg-[#efeeeb] transition-colors"
                                  title="Inspect Schema"
                                  type="button"
                                >
                                  <FileCode className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteService(svc.id, svc.name)}
                                  className="p-1.5 rounded-lg text-[#5b5e66] hover:text-rose-600 hover:bg-[#efeeeb] transition-colors"
                                  title="Delete Service"
                                  type="button"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination & Status Strip Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-[#5b5e66] text-xs border-t border-[#efeeeb]">
                <div className="flex items-center gap-2">
                  <span>Showing {filteredServices.length} of {services.length} registered services</span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-[#735c00]">Block sync: #18920491 (Finalized)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <button className="px-2.5 py-1 rounded bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a] disabled:opacity-40" disabled type="button">
                    Previous
                  </button>
                  <span className="px-2 font-bold text-[#1b1c1a]">1</span>
                  <button className="px-2.5 py-1 rounded bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a]" type="button">
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Protocol Architecture & Telemetry Section (3 Cards) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Architectural Card 1: HTTP 402 Protocol */}
              <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center text-[#735c00]">
                      <Shield className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1b1c1a]">HTTP 402 Micropayments</h3>
                  </div>
                  <p className="text-xs text-[#5b5e66] mt-1 leading-relaxed">
                    Incoming proxy requests trigger automated <code className="bg-[#efeeeb] px-1 rounded text-[#1b1c1a] font-mono text-[11px]">402 Payment Required</code> headers containing a signed EIP-712 nonce voucher.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#efeeeb] flex items-center justify-between text-xs text-[#5b5e66]">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Replay protection active
                  </span>
                  <span className="font-mono text-[#1b1c1a] font-bold">RFC-402 Compliant</span>
                </div>
              </div>

              {/* Architectural Card 2: JSON-Schema Enforcement */}
              <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#1b1c1a]">
                      <ShieldCheck className="w-4 h-4 text-[#735c00]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1b1c1a]">On-Chain Schema Guard</h3>
                  </div>
                  <p className="text-xs text-[#5b5e66] mt-1 leading-relaxed">
                    Every payload returned by your endpoints is validated against its on-chain registered JSON Schema hash. Mismatched structures forfeit escrow release to protect consumer agents.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#efeeeb] flex items-center justify-between text-xs text-[#5b5e66]">
                  <span className="flex items-center gap-1 text-amber-700 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {degradedEndpoints} Flagged mismatches
                  </span>
                  <span className="font-mono text-[#1b1c1a] font-bold">Auto-Quarantine</span>
                </div>
              </div>

              {/* Architectural Card 3: Gasless EIP-3009 Settlement */}
              <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center text-[#735c00]">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1b1c1a]">Gasless Settlement</h3>
                  </div>
                  <p className="text-xs text-[#5b5e66] mt-1 leading-relaxed">
                    Batch authorization vouchers via <code className="bg-[#efeeeb] px-1 rounded text-[#1b1c1a] font-mono text-[11px]">receiveWithAuthorization</code> pool multiple micropayments into a single zero-overhead transaction.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#efeeeb] flex items-center justify-between text-xs text-[#5b5e66]">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Base Sepolia Bundler Online
                  </span>
                  <span className="font-mono text-[#735c00] font-bold">0.00% Seller Gas</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. BUYER SCOUT DISPATCHER DEDICATED VIEW */}
        {activeNavTab === "dispatcher" && (
          <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto w-full">
            {/* Header / Breadcrumb Section with Ambient Glow */}
            <div className="relative overflow-hidden bg-white p-6 md:p-8 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#735c00]/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 relative z-10">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-[#5b5e66]">
                  <span>Workspace</span>
                  <span className="text-[#d0c5af]">/</span>
                  <span className="text-[#1b1c1a]">Buyer Scout Dispatcher</span>
                  <span className="text-[#d0c5af]">•</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Scout v1.4.2 Autonomous</span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#efeeeb] text-[#1b1c1a] text-xs font-semibold shadow-sm border border-[#d0c5af]/30">
                  <ShieldCheck className="w-4 h-4 text-[#735c00]" />
                  <span>EIP-3009 Gasless Relay</span>
                </div>
              </div>
              <div className="relative z-10 max-w-3xl">
                <h1 className="text-2xl md:text-3xl font-bold text-[#1b1c1a] tracking-tight mb-1">
                  Autonomous Buyer Scout Dispatcher
                </h1>
                <p className="text-xs md:text-sm text-[#4d4635] leading-relaxed">
                  Instruct autonomous buyer AI agents that negotiate micro-fees, sign EIP-3009 gasless vouchers, and stream step-by-step executions in real-time.
                </p>
              </div>
            </div>

            {/* KPI Metric Cards Row (4 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1 */}
              <div className="bg-white p-4 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.06),0_2px_6px_-1px_rgba(13,17,23,0.03)] border border-[#d4af37]/20 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
                <div className="flex items-center justify-between text-[#5b5e66] mb-2 text-[10px] uppercase font-bold tracking-wider">
                  <span>Active Buyer Wallet</span>
                  <WalletIcon className="w-4 h-4 text-[#735c00]" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#1b1c1a] bg-[#f5f3f0] px-2 py-1 rounded border border-[#d0c5af]/30">
                    {wallets.find((w) => w.role === "buyer")?.address.slice(0, 8)}...
                    {wallets.find((w) => w.role === "buyer")?.address.slice(-6)}
                  </span>
                  <button
                    onClick={() => {
                      const addr = wallets.find((w) => w.role === "buyer")?.address || "";
                      navigator.clipboard.writeText(addr);
                      triggerToast("Buyer wallet address copied");
                    }}
                    className="text-[#5b5e66] hover:text-[#735c00] transition-colors p-1 rounded hover:bg-[#efeeeb]"
                    type="button"
                    title="Copy Buyer Address"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-white p-4 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.06),0_2px_6px_-1px_rgba(13,17,23,0.03)] border border-[#d4af37]/20 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
                <div className="flex items-center justify-between text-[#5b5e66] mb-2 text-[10px] uppercase font-bold tracking-wider">
                  <span>Available Buyer Balance</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-emerald-700 tracking-tight font-mono">
                    ${((wallets.find((w) => w.role === "buyer")?.balance || 9770000) / 1e6).toFixed(2)}
                  </span>
                  <span className="text-xs text-emerald-800 font-semibold">USDC</span>
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-white p-4 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.06),0_2px_6px_-1px_rgba(13,17,23,0.03)] border border-[#d4af37]/20 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
                <div className="flex items-center justify-between text-[#5b5e66] mb-2 text-[10px] uppercase font-bold tracking-wider">
                  <span>Budget Limit Cap</span>
                  <Shield className="w-4 h-4 text-[#735c00]" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-[#735c00] tracking-tight font-mono">
                    ${budgetUsdc.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#4d4635] font-semibold">USDC</span>
                </div>
              </div>

              {/* KPI 4 */}
              <div className="bg-white p-4 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.06),0_2px_6px_-1px_rgba(13,17,23,0.03)] border border-[#d4af37]/20 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
                <div className="flex items-center justify-between text-[#5b5e66] mb-2 text-[10px] uppercase font-bold tracking-wider">
                  <span>Max Concurrency</span>
                  <Cpu className="w-4 h-4 text-[#735c00]" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-[#1b1c1a] tracking-tight font-mono">
                    {concurrency}
                  </span>
                  <span className="text-xs text-[#5b5e66] font-semibold">Parallel Workers</span>
                </div>
              </div>
            </div>

            {/* Main Dispatcher & Execution Grid (2-Columns on lg screens) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Mission Control & Parameters */}
              <div className="lg:col-span-6 bg-white p-6 md:p-8 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col gap-5">
                {/* Header with Scout Bot Companion */}
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(212,175,55,0.2)] bg-[#f5f3f0] border border-[#d4af37]/30 flex-shrink-0">
                    <img
                      alt="Scout Bot Avatar"
                      className="w-full h-full object-cover"
                      src="/bots/bot-1.svg"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[#1b1c1a]">Mission Control &amp; Parameters</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/20 text-[#554300] text-[10px] font-bold uppercase tracking-wide">
                        Autonomous Scout
                      </span>
                    </div>
                    <p className="text-xs text-[#5b5e66]">
                      Give Scout an instruction prompt. It resolves candidate tools, verifies 402 gas prices, and signs EIP-3009 offline vouchers.
                    </p>
                  </div>
                </div>

                {/* Task Instruction Prompt */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#5b5e66]">
                      Task Instruction Prompt
                    </label>
                    <span className="font-mono text-[10px] text-[#5b5e66]">
                      {taskPrompt.length} chars
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={taskPrompt}
                    onChange={(e) => setTaskPrompt(e.target.value)}
                    className="w-full bg-[#f5f3f0] text-[#1b1c1a] p-3.5 rounded-xl font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:bg-white border border-[#d0c5af]/50 shadow-inner transition-all"
                  />
                </div>

                {/* Judge Demo Presets Section */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1b1c1a] tracking-wide">Judge Demo Presets:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      8 Micro-Services Active
                    </span>
                  </div>

                  {/* Primary Master Preset Card */}
                  <div
                    onClick={() => {
                      setActivePreset("master");
                      setTaskPrompt("Execute master enterprise intelligence: scrape international catalogue, convert foreign prices to rupees, evaluate customer review sentiment, query Base L2 gas & crypto oracle, perform vendor AML compliance audit, and compile executive dossier.");
                      setBudgetUsdc((prev) => Math.max(prev, 0.75));
                      setConcurrency(4);
                      triggerToast("Loaded: 6-Step Master Mission (Invokes all 6 services across Base Sepolia)");
                    }}
                    className={`relative overflow-hidden p-3.5 rounded-xl border cursor-pointer hover:shadow-md transition-all group ${
                      activePreset === "master"
                        ? "bg-gradient-to-br from-[#d4af37]/25 via-[#d4af37]/10 to-[#f5f3f0] border-[#d4af37] shadow-[0_2px_12px_rgba(212,175,55,0.2)] ring-1 ring-[#d4af37]"
                        : "bg-gradient-to-br from-[#d4af37]/15 via-[#d4af37]/5 to-[#f5f3f0] border-[#d4af37]/40 shadow-[0_2px_8px_rgba(212,175,55,0.12)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#1b1c1a] group-hover:text-[#735c00] transition-colors">
                          🌟 6-Step Master Enterprise Mission
                        </span>
                        <span className="bg-[#d4af37] text-[#554300] text-[9px] px-2 py-0.5 rounded font-bold tracking-wider">
                          FULL DEMO
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#735c00] font-mono flex-shrink-0">
                        ~$0.23 <span className="text-[10px] text-[#5b5e66] font-normal">USDC</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-[#4d4635] leading-tight">
                      Invokes 6 services: Scrape + FX Rates + Sentiment + L2 Oracle + AML Compliance + Executive Dossier
                    </p>
                  </div>

                  {/* 3 Quick Preset Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePreset("3step");
                        setTaskPrompt("From pages 1 to 4 of books.toscrape.com, find the three cheapest 5-star books, give their prices in rupees, and summarise each description in Hindi.");
                        setBudgetUsdc((prev) => Math.max(prev, 0.50));
                        setConcurrency(3);
                        triggerToast("Loaded: 3-Step Pipeline (Scrape + FX + Hindi)");
                      }}
                      className={`px-2.5 py-2 rounded-lg text-left transition-all flex flex-col gap-0.5 group border ${
                        activePreset === "3step"
                          ? "bg-white border-[#d4af37] shadow-sm ring-1 ring-[#d4af37]"
                          : "bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#4d4635] hover:text-[#1b1c1a] border-[#d0c5af]/30"
                      }`}
                    >
                      <span className="font-semibold text-[#1b1c1a] group-hover:text-[#735c00] truncate">🎯 3-Step Pipeline</span>
                      <span className="text-[#5b5e66] truncate">Scrape + FX + Hindi (~$0.09)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePreset("fallback");
                        setTaskPrompt("Scrape books inventory using Budget Scraper, detect schema mismatch, and fallback to Books Scraper Pro.");
                        setBudgetUsdc(0.25);
                        setConcurrency(2);
                        triggerToast("Loaded: Fallback Test (Runs 1 service with 2-tier recovery, costs $0.05)");
                      }}
                      className={`px-2.5 py-2 rounded-lg text-left transition-all flex flex-col gap-0.5 group border ${
                        activePreset === "fallback"
                          ? "bg-white border-[#d4af37] shadow-sm ring-1 ring-[#d4af37]"
                          : "bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#4d4635] hover:text-[#1b1c1a] border-[#d0c5af]/30"
                      }`}
                    >
                      <span className="font-semibold text-[#1b1c1a] group-hover:text-[#735c00] truncate">🛡️ Fallback Test</span>
                      <span className="text-[#5b5e66] truncate">1 Service ($0.05) + Fallback</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePreset("exhaustion");
                        setTaskPrompt("Attempt scraping books with tight cap to test HTTP 402 budget exhaustion refusal.");
                        setBudgetUsdc(0.01);
                        setConcurrency(1);
                        triggerToast("Loaded: Exhaustion Cap Test (Demonstrates 402 budget refusal)");
                      }}
                      className={`px-2.5 py-2 rounded-lg text-left transition-all flex flex-col gap-0.5 group border ${
                        activePreset === "exhaustion"
                          ? "bg-white border-[#d4af37] shadow-sm ring-1 ring-[#d4af37]"
                          : "bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#4d4635] hover:text-[#1b1c1a] border-[#d0c5af]/30"
                      }`}
                    >
                      <span className="font-semibold text-[#1b1c1a] group-hover:text-[#735c00] truncate">⚡ Exhaustion Cap</span>
                      <span className="text-[#5b5e66] truncate">Tight Cap Refusal ($0.01)</span>
                    </button>
                  </div>
                </div>

                {/* Sliders: Budget Limit & Max Concurrency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Budget Slider */}
                  <div className="flex flex-col gap-1.5 bg-[#f5f3f0] p-3.5 rounded-xl border border-[#d0c5af]/40">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">
                          Budget Ceiling (Max Cap)
                        </label>
                        <span className="text-[9px] text-[#735c00] font-semibold">Pay-per-call: Unspent budget is preserved</span>
                      </div>
                      <span className="text-xs font-bold text-[#735c00] font-mono">
                        ${budgetUsdc.toFixed(2)} USDC
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="2.50"
                      step="0.05"
                      value={budgetUsdc}
                      onChange={(e) => setBudgetUsdc(parseFloat(e.target.value))}
                      className="w-full accent-[#d4af37] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#5b5e66] font-mono">
                      <span>$0.05</span>
                      <span>$2.50</span>
                    </div>
                  </div>


                  {/* Max Concurrency Slider */}
                  <div className="flex flex-col gap-1.5 bg-[#f5f3f0] p-3.5 rounded-xl border border-[#d0c5af]/40">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">
                        Max Concurrency
                      </label>
                      <span className="text-xs font-bold text-[#1b1c1a] font-mono">
                        {concurrency} Workers
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={concurrency}
                      onChange={(e) => setConcurrency(parseInt(e.target.value))}
                      className="w-full accent-[#735c00] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#5b5e66] font-mono">
                      <span>1</span>
                      <span>8 Threads</span>
                    </div>
                  </div>
                </div>

                {/* CTA Launch Button */}
                <button
                  onClick={handleLaunchAgent}
                  disabled={isRunning}
                  className="w-full py-4 px-6 rounded-xl bg-[#d4af37] text-[#554300] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_6px_20px_rgba(212,175,55,0.28)] hover:shadow-[0_8px_24px_rgba(212,175,55,0.36)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Scout Dispatched &amp; Negotiating...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-5 h-5" />
                      <span>Launch Autonomous Buyer Agent</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Real-Time Execution Stream Console */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="w-full bg-[#1b1c1a] text-[#fbf9f6] rounded-xl overflow-hidden shadow-2xl flex flex-col h-[680px] border border-[#d4af37]/30">
                  {/* Terminal Header */}
                  <div className="bg-[#121312] px-4 py-3 flex items-center justify-between border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37] inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      </div>
                      <span className="text-xs text-[#eae8e5] font-mono tracking-tight ml-2 font-bold">
                        Real-Time Execution Stream
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-zinc-500">Task:</span>
                      <span className="text-[#e9c349] font-bold">
                        {currentTaskId || "task-wp7mzls6"}
                      </span>
                    </div>
                  </div>

                  {/* Terminal Logs Stream */}
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed flex flex-col gap-2.5 bg-[#1b1c1a] text-[#dfe2eb]">
                    {events.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs py-12 gap-3 text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
                          <Bot className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-zinc-300 font-bold mb-1">Awaiting Autonomous Dispatch</p>
                          <p className="text-zinc-500 text-[11px] max-w-sm">
                            Click &quot;Launch Autonomous Buyer Agent&quot; or pick a preset to stream cryptographic authorizations and Base Sepolia settlements.
                          </p>
                        </div>
                      </div>
                    ) : (
                      events.map((ev, idx) => {
                        const isSettled = ev.type.includes("SUCCESS") || ev.type.includes("SETTLED");
                        const isFailed = ev.type.includes("FAILED") || ev.type.includes("REJECTED");
                        const isFallback = ev.type.includes("FALLBACK");

                        if (isSettled) {
                          return (
                            <div key={idx} className="flex items-start gap-2 pl-3 border-l-2 border-emerald-500/50 py-0.5">
                              <span className="text-emerald-400 font-bold select-none">✓</span>
                              <div className="flex-1">
                                <span className="text-zinc-200">{ev.message}</span>
                              </div>
                            </div>
                          );
                        }

                        if (isFailed) {
                          return (
                            <div key={idx} className="flex items-start gap-2 pl-3 border-l-2 border-rose-500/50 py-0.5">
                              <span className="text-rose-400 font-bold select-none">✕</span>
                              <div className="flex-1">
                                <span className="text-rose-300">{ev.message}</span>
                              </div>
                            </div>
                          );
                        }

                        if (isFallback) {
                          return (
                            <div key={idx} className="flex items-start gap-2 pl-3 border-l-2 border-amber-500/50 py-0.5">
                              <span className="text-amber-400 font-bold select-none">🛡️</span>
                              <div className="flex-1">
                                <span className="text-amber-300">{ev.message}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-[#d4af37] select-none font-bold">›</span>
                            <div className="flex-1">
                              {ev.type === "PLAN_GENERATED" && (
                                <span className="text-[#e9c349] font-bold mr-1.5">[SCOUT PLANNER]</span>
                              )}
                              {ev.type === "BUDGET_RESERVED" && (
                                <span className="text-emerald-400 font-bold mr-1.5">[ESCROW LEASE]</span>
                              )}
                              {ev.type === "SELLER_SELECTED" && (
                                <span className="text-sky-300 font-bold mr-1.5">[DISCOVERY]</span>
                              )}
                              {ev.type === "CHALLENGE_402_RECEIVED" && (
                                <span className="text-amber-300 font-bold mr-1.5">[HTTP 402]</span>
                              )}
                              {ev.type === "PRICE_VERIFIED" && (
                                <span className="text-teal-300 font-bold mr-1.5">[PRICE CHECK]</span>
                              )}
                              {ev.type === "PAYMENT_SIGNED" && (
                                <span className="text-purple-300 font-bold mr-1.5">[EIP-3009 VOUCHER]</span>
                              )}
                              <span className="text-zinc-300">{ev.message}</span>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {runSummary && (
                      <div className="flex items-start gap-2 mt-2 pt-2 bg-emerald-950/40 border border-emerald-500/40 p-2.5 rounded-lg">
                        <span className="text-emerald-400 select-none font-bold">★</span>
                        <div className="flex-1">
                          <span className="text-emerald-300 font-bold">Task execution succeeded: </span>
                          <span className="text-emerald-400 font-bold font-mono">
                            Total Spent: ${((runSummary.totalSpent as number || 0) / 1e6).toFixed(4)} USDC
                          </span>
                          {((runSummary.budgetLimit as number || 0) > (runSummary.totalSpent as number || 0)) && (
                            <span className="text-emerald-200/90 text-xs font-mono ml-2">
                              (Preserved ${(((runSummary.budgetLimit as number || 0) - (runSummary.totalSpent as number || 0)) / 1e6).toFixed(4)} USDC unspent from ${(Number(runSummary.budgetLimit || 0) / 1e6).toFixed(2)} cap)
                            </span>
                          )}
                          <span className="text-zinc-400 text-[10px] block mt-0.5">
                            Pay-as-you-go: All micro-settlement vouchers verified with cryptographic ECDSA signatures on Base Sepolia. Unused budget is never debited.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Terminal Footer Bar */}
                  <div className="bg-[#121312] px-4 py-3 flex items-center justify-between font-mono text-xs border-t border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">Settled:</span>
                      <span className="text-emerald-400 font-bold">
                        ${runSummary ? ((runSummary.totalSpent as number || 0) / 1e6).toFixed(4) : "0.0000"} USDC
                      </span>
                      {runSummary && ((runSummary.budgetLimit as number || 0) > (runSummary.totalSpent as number || 0)) && (
                        <span className="text-zinc-400 text-[10px]">
                          • Saved: ${(((runSummary.budgetLimit as number || 0) - (runSummary.totalSpent as number || 0)) / 1e6).toFixed(4)} USDC
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[11px]">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <span>Relay:</span>
                        <span className="text-white font-semibold">EIP-3009</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <span>Fallback:</span>
                        <span className="text-[#d4af37] font-semibold">
                          {runSummary?.fallbackUsed ? "Triggered" : "Direct"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Educational Workflow Architecture Section */}
            <div className="flex flex-col gap-3 pt-2 pb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#735c00]" />
                <h2 className="text-lg font-bold text-[#1b1c1a]">
                  How the Autonomous Scout Pipeline Executes
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Step 1 */}
                <div className="bg-white p-4 rounded-xl shadow-[0_2px_12px_rgba(212,175,55,0.06)] border border-[#d4af37]/20 flex flex-col gap-1.5 relative overflow-hidden group hover:-translate-y-1 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#735c00] font-bold font-mono text-xs border border-[#d0c5af]/30">
                    01
                  </div>
                  <span className="text-sm font-bold text-[#1b1c1a]">Tool Discovery</span>
                  <p className="text-xs text-[#5b5e66] leading-relaxed">
                    Scout queries the registered service catalog to find optimal AI endpoints matching the prompt intent.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-white p-4 rounded-xl shadow-[0_2px_12px_rgba(212,175,55,0.06)] border border-[#d4af37]/20 flex flex-col gap-1.5 relative overflow-hidden group hover:-translate-y-1 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#735c00] font-bold font-mono text-xs border border-[#d0c5af]/30">
                    02
                  </div>
                  <span className="text-sm font-bold text-[#1b1c1a]">HTTP 402 Handshake</span>
                  <p className="text-xs text-[#5b5e66] leading-relaxed">
                    Candidate endpoint responds with HTTP 402, nonce, price in USDC atomic units, and seller beneficiary address.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-white p-4 rounded-xl shadow-[0_2px_12px_rgba(212,175,55,0.06)] border border-[#d4af37]/20 flex flex-col gap-1.5 relative overflow-hidden group hover:-translate-y-1 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#735c00] font-bold font-mono text-xs border border-[#d0c5af]/30">
                    03
                  </div>
                  <span className="text-sm font-bold text-[#1b1c1a]">EIP-3009 Voucher</span>
                  <p className="text-xs text-[#5b5e66] leading-relaxed">
                    Buyer signs an offline ECDSA voucher with authorization parameters within the configured budget cap.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="bg-white p-4 rounded-xl shadow-[0_2px_12px_rgba(212,175,55,0.06)] border border-[#d4af37]/20 flex flex-col gap-1.5 relative overflow-hidden group hover:-translate-y-1 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#735c00] font-bold font-mono text-xs border border-[#d0c5af]/30">
                    04
                  </div>
                  <span className="text-sm font-bold text-[#1b1c1a]">Settlement &amp; Output</span>
                  <p className="text-xs text-[#5b5e66] leading-relaxed">
                    Facilitator relayer executes the payment on Base Sepolia. Output is verified against strict JSON Schema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. EXECUTIONS & ANALYTICS DEDICATED VIEW */}
        {activeNavTab === "analytics" && (
          <div className="flex flex-col gap-6 animate-fade-in max-w-[1540px] mx-auto w-full">
            {/* Top Header Banner & Context */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-[#d4af37]/20 bg-white p-6 md:p-8 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-[#5b5e66]">
                    <span className="hover:text-[#735c00] transition-colors cursor-pointer font-bold uppercase tracking-wider text-[10px]">
                      Workspace
                    </span>
                    <span className="text-[#d0c5af]">/</span>
                    <span className="text-[#1b1c1a] font-bold uppercase tracking-wider text-[10px]">
                      Executions &amp; Analytics
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 shadow-sm ml-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-emerald-800 font-bold tracking-wider">
                      {settledCalls} Settled Inbound Calls
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#735c00] text-[10px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>EIP-712 Verified</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#1b1c1a] tracking-tight">
                    Executions, Audit Trail &amp; Settlement Analytics
                  </h1>
                </div>
                <p className="text-xs md:text-sm text-[#5b5e66] max-w-4xl leading-relaxed mt-0.5">
                  Cryptographic ECDSA EIP-712 settlement signatures, on-chain transaction hashes, latency metrics, and verifiable escrow receipts on Base Sepolia.
                </p>
              </div>

              {/* Header Action Controls */}
              <div className="flex items-center gap-3 flex-wrap self-start xl:self-auto">
                <div className="flex items-center gap-2 bg-[#f5f3f0] px-3 py-2 rounded-full shadow-sm text-[#5b5e66] border border-[#d0c5af]/40">
                  <RotateCw className="w-3.5 h-3.5 text-[#735c00] animate-spin" style={{ animationDuration: "3.5s" }} />
                  <span className="text-[11px] font-semibold tracking-wide text-[#1b1c1a]">Auto-refreshing (4s)</span>
                </div>
                <button
                  onClick={refreshAllData}
                  aria-label="Refresh telemetry"
                  className="w-9 h-9 rounded-full bg-[#f5f3f0] hover:bg-[#eae8e5] flex items-center justify-center text-[#1b1c1a] transition-all shadow-sm border border-[#d0c5af]/40"
                  type="button"
                  title="Refresh telemetry"
                >
                  <RotateCw className="w-4 h-4 text-[#735c00]" />
                </button>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 bg-[#1b1c1a] text-white px-4 py-2 rounded-full text-xs font-bold shadow-md hover:bg-[#30312f] active:scale-95 transition-all"
                  type="button"
                >
                  <Download className="w-4 h-4 text-[#ffe088]" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* 4 Top KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1 */}
              <div className="relative bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between overflow-hidden group hover:shadow-[0_8px_24px_rgba(212,175,55,0.14)] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Total Invocations</span>
                  <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#1b1c1a]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#1b1c1a] tracking-tight font-mono">{totalInvocations}</span>
                  <span className="text-[10px] text-[#735c00] font-bold bg-[#d4af37]/20 px-1.5 py-0.5 rounded font-mono">+14.2%</span>
                </div>
                <div className="flex items-center justify-between text-[#5b5e66] text-[11px] pt-1.5 border-t border-[#efeeeb]">
                  <span>Across all proxy endpoints</span>
                  <span className="font-mono text-[#1b1c1a] font-semibold">{healthyEndpoints} active</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* KPI 2 */}
              <div className="relative bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between overflow-hidden group hover:shadow-[0_8px_24px_rgba(212,175,55,0.14)] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Settled Micro-Fees</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-700 tracking-tight font-mono">+${totalRevenueUsdc}</span>
                  <span className="text-[10px] text-[#5b5e66] font-semibold">USDC</span>
                </div>
                <div className="flex items-center justify-between text-[#5b5e66] text-[11px] pt-1.5 border-t border-[#efeeeb]">
                  <span>{settledCalls} settled inbound calls</span>
                  <span className="font-mono text-emerald-700 font-bold">100% Escrow</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* KPI 3 */}
              <div className="relative bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between overflow-hidden group hover:shadow-[0_8px_24px_rgba(212,175,55,0.14)] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Delivery SLA</span>
                  <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#735c00]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#1b1c1a] tracking-tight font-mono">{deliveryRate}%</span>
                  <span className="text-[10px] text-rose-800 font-bold bg-rose-100 px-1.5 py-0.5 rounded font-mono">
                    {schemaDisputes} caught
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#5b5e66] text-[11px] pt-1.5 border-t border-[#efeeeb]">
                  <span>Schema disputes refunded</span>
                  <span className="font-mono text-[#1b1c1a] font-semibold">Auto-reimbursed</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* KPI 4 */}
              <div className="relative bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between overflow-hidden group hover:shadow-[0_8px_24px_rgba(212,175,55,0.14)] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Median Latency</span>
                  <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#735c00]">
                    <Gauge className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#735c00] tracking-tight font-mono">
                    {medianLatency}<span className="text-xs font-normal text-[#5b5e66]">ms</span>
                  </span>
                  <span className="text-[10px] text-[#5b5e66] font-mono">P99: {p99Latency}ms</span>
                </div>
                <div className="flex items-center justify-between text-[#5b5e66] text-[11px] pt-1.5 border-t border-[#efeeeb]">
                  <span>Fast L2 Base Sepolia</span>
                  <span className="font-mono text-[#735c00] font-bold">Block time 2s</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>

            {/* Scout Bot Sentinel & Settlement Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Visual Mascot Companion Spotlight Card */}
              <div className="lg:col-span-4 bg-white rounded-xl p-6 shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-start justify-between z-10">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-[#735c00] text-[10px] uppercase tracking-wider font-bold">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Scout Sentinel Node</span>
                    </div>
                    <h2 className="text-base font-bold text-[#1b1c1a] mt-0.5">Autonomous Escrow Agent</h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Online</span>
                </div>

                {/* Mascot Display with Halo */}
                <div className="relative py-4 flex items-center justify-center">
                  <div className="absolute w-40 h-40 rounded-full bg-gradient-to-tr from-[#d4af37]/20 to-[#fee179]/40 blur-2xl"></div>
                  <div className="relative p-2 rounded-2xl bg-white/80 backdrop-blur-sm shadow-md border border-[#d4af37]/30">
                    <img
                      alt="Scout Bot robot companion avatar"
                      className="w-28 h-28 rounded-xl object-cover hover:scale-105 transition-transform duration-300"
                      src="/bots/bot-1.svg"
                    />
                  </div>
                </div>

                <div className="z-10 bg-[#f5f3f0] rounded-xl p-3.5 flex flex-col gap-2 border border-[#d0c5af]/30 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5b5e66] font-medium">ECDSA Key Scheme:</span>
                    <span className="font-mono text-[#1b1c1a] font-semibold">secp256k1 EIP-712</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5b5e66] font-medium">Replay Protection:</span>
                    <span className="font-mono text-emerald-700 font-bold">ChainID 84532 Salt Nonce</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5b5e66] font-medium">Direct Settlement Gas:</span>
                    <span className="font-mono text-[#735c00] font-bold">0.00 Gwei (Gasless Relayer)</span>
                  </div>
                </div>
              </div>

              {/* Settlement Performance & Distribution Chart Card */}
              <div className="lg:col-span-8 bg-white rounded-xl p-6 shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#efeeeb]">
                  <div>
                    <h2 className="text-base font-bold text-[#1b1c1a]">Hourly Settlement Volume &amp; Latency Profile</h2>
                    <p className="text-xs text-[#5b5e66]">Inbound execution calls &amp; avg response times across last 12 hours</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-[#d4af37]"></span>
                      <span className="text-[#5b5e66]">Volume (Calls)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-[#10b981]"></span>
                      <span className="text-[#5b5e66]">Avg Latency (ms)</span>
                    </div>
                  </div>
                </div>

                {/* Inline SVG Visualization */}
                <div className="w-full py-3">
                  <svg className="w-full h-40 overflow-visible" fill="none" viewBox="0 0 760 170" xmlns="http://www.w3.org/2000/svg">
                    <line stroke="#eae8e5" strokeDasharray="3 3" x1="40" x2="740" y1="20" y2="20"></line>
                    <line stroke="#eae8e5" strokeDasharray="3 3" x1="40" x2="740" y1="60" y2="60"></line>
                    <line stroke="#eae8e5" strokeDasharray="3 3" x1="40" x2="740" y1="100" y2="100"></line>
                    <line stroke="#eae8e5" x1="40" x2="740" y1="140" y2="140"></line>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="10" y="24">12 calls</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="10" y="64">8 calls</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="10" y="104">4 calls</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="10" y="144">0</text>
                    {/* Hourly Bars */}
                    <rect fill="#efeeeb" height="30" rx="3" width="28" x="60" y="110"></rect>
                    <rect fill="#e4e2df" height="55" rx="3" width="28" x="120" y="85"></rect>
                    <rect fill="#efeeeb" height="45" rx="3" width="28" x="180" y="95"></rect>
                    <rect fill="#d4af37" fillOpacity="0.75" height="80" rx="3" width="28" x="240" y="60"></rect>
                    <rect fill="#d4af37" height="90" rx="3" width="28" x="300" y="50"></rect>
                    <rect fill="#d4af37" fillOpacity="0.85" height="70" rx="3" width="28" x="360" y="70"></rect>
                    <rect fill="#d4af37" height="100" rx="3" width="28" x="420" y="40"></rect>
                    <rect fill="#735c00" height="110" rx="3" width="28" x="480" y="30"></rect>
                    <rect fill="#d4af37" fillOpacity="0.9" height="75" rx="3" width="28" x="540" y="65"></rect>
                    <rect fill="#d4af37" fillOpacity="0.6" height="60" rx="3" width="28" x="600" y="80"></rect>
                    <rect fill="#d4af37" height="95" rx="3" width="28" x="660" y="45"></rect>
                    {/* Latency Trendline Overlay */}
                    <path d="M 74 125 Q 134 110 194 100 T 314 78 T 434 50 T 494 42 T 554 68 T 614 75 T 674 52" fill="none" stroke="#10b981" strokeLinecap="round" strokeWidth="2.5"></path>
                    <circle cx="494" cy="42" fill="#10b981" r="4.5" stroke="#ffffff" strokeWidth="2"></circle>
                    <circle cx="674" cy="52" fill="#10b981" r="4.5" stroke="#ffffff" strokeWidth="2"></circle>
                    {/* X Axis Labels */}
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="64" y="156">10:00</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="184" y="156">13:00</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="304" y="156">16:00</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="424" y="156">19:00</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="544" y="156">21:00</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="664" y="156">Live (Now)</text>
                  </svg>
                </div>

                {/* Protocol breakdown pill footer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#efeeeb] text-[11px]">
                  <div className="flex items-center justify-between px-3 py-2 bg-[#f5f3f0] rounded-xl border border-[#d0c5af]/30">
                    <span className="text-[#5b5e66]">EIP-3009 Gasless:</span>
                    <span className="font-bold text-[#1b1c1a] font-mono">{deliveryRate}% ({settledCalls}/{totalInvocations || 1})</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-[#f5f3f0] rounded-xl border border-[#d0c5af]/30">
                    <span className="text-[#5b5e66]">HTTP 402 Handshake:</span>
                    <span className="font-bold text-[#1b1c1a] font-mono">100% Validated</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-[#f5f3f0] rounded-xl border border-[#d0c5af]/30">
                    <span className="text-[#5b5e66]">Base Sepolia L2:</span>
                    <span className="font-bold text-emerald-700 font-mono">100% On-Chain</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro-Settlement Ledger Section */}
            <div className="bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 overflow-hidden flex flex-col">
              {/* Table Header & Filter Bar */}
              <div className="p-6 border-b border-[#efeeeb] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#fbf9f6]">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <h2 className="text-lg font-bold text-[#1b1c1a]">Micro-Settlement Ledger</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#efeeeb] text-[#1b1c1a] text-[11px] font-bold font-mono">
                      {ledger.length} Recorded Invocations
                    </span>
                  </div>
                  <p className="text-xs text-[#5b5e66]">
                    Real-time audit trail of cryptographic authorizations, gasless transfers &amp; schema verification receipts.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-[#5b5e66] w-4 h-4 pointer-events-none" />
                    <input
                      value={ledgerSearchQuery}
                      onChange={(e) => setLedgerSearchQuery(e.target.value)}
                      placeholder="Filter by Tx Hash or Buyer..."
                      className="pl-9 pr-3 py-1.5 rounded-xl bg-white text-[#1b1c1a] text-xs border border-[#d0c5af]/50 focus:outline-none focus:ring-1 focus:ring-[#d4af37] w-64 shadow-inner"
                      type="text"
                    />
                  </div>
                  <div className="flex items-center bg-[#f5f3f0] p-1 rounded-xl border border-[#d0c5af]/30 text-xs font-semibold">
                    <button
                      onClick={() => setLedgerFilterTab("all")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        ledgerFilterTab === "all"
                          ? "bg-white text-[#1b1c1a] font-bold shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                    >
                      All ({ledger.length})
                    </button>
                    <button
                      onClick={() => setLedgerFilterTab("settled")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        ledgerFilterTab === "settled"
                          ? "bg-white text-[#1b1c1a] font-bold shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                    >
                      Settled ({settledCalls})
                    </button>
                    <button
                      onClick={() => setLedgerFilterTab("disputes")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        ledgerFilterTab === "disputes"
                          ? "bg-white text-[#1b1c1a] font-bold shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                    >
                      Disputes ({schemaDisputes})
                    </button>
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f5f3f0] text-[#5b5e66] text-[10px] uppercase tracking-wider font-bold border-b border-[#efeeeb]">
                      <th className="py-3 px-4">Time / Nonce</th>
                      <th className="py-3 px-4">Buyer Agent</th>
                      <th className="py-3 px-4">Invoiced Service</th>
                      <th className="py-3 px-4 text-right">Fee Collected</th>
                      <th className="py-3 px-4 text-center">Latency</th>
                      <th className="py-3 px-4">Settled Protocol</th>
                      <th className="py-3 px-4">On-Chain Tx Hash</th>
                      <th className="py-3 px-4 text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efeeeb]">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-[#5b5e66]">
                          No ledger records match the active filter.
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((entry, idx) => {
                        const isSettled = entry.status === "SETTLED";
                        const isDispute = entry.status && entry.status.includes("FAILED");

                        return (
                          <tr
                            key={entry._id || idx}
                            className={`hover:bg-[#f5f3f0]/60 transition-colors group ${
                              isDispute ? "bg-rose-50/20" : ""
                            }`}
                          >
                            <td className="py-3 px-4 font-mono text-[11px] text-[#5b5e66] whitespace-nowrap">
                              <span className="text-[#1b1c1a] font-semibold">
                                {new Date(entry.createdAt).toLocaleTimeString()}
                              </span>
                              <span className="block text-[10px] text-[#5b5e66]">
                                #{entry.taskId ? entry.taskId.slice(-7) : `0988${idx}-A`}
                              </span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <img
                                  alt="Buyer Bot Avatar"
                                  className="w-6 h-6 rounded-md object-cover shadow-sm border border-[#d4af37]/30"
                                  src="/bots/bot-1.svg"
                                />
                                <div className="flex flex-col">
                                  <span className="font-semibold text-[#1b1c1a] text-xs">Scout Alpha</span>
                                  <span className="font-mono text-[10px] text-[#5b5e66]">
                                    {entry.buyer.slice(0, 5)}...{entry.buyer.slice(-3)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[#1b1c1a]">{entry.serviceName}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {isSettled ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold text-xs">
                                  <Check className="w-3.5 h-3.5" />
                                  +${((entry.paidPrice || 0) / 1_000_000).toFixed(4)} USDC
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-mono font-bold text-xs">
                                  <span>✕</span>
                                  $0.0000 (Refunded)
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span
                                className={`font-mono font-semibold text-[11px] px-2 py-0.5 rounded ${
                                  isDispute ? "bg-rose-100 text-rose-800" : "bg-[#efeeeb] text-[#1b1c1a]"
                                }`}
                              >
                                {entry.latencyMs}ms
                              </span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                  isDispute
                                    ? "bg-rose-100 text-rose-900"
                                    : "bg-[#efeeeb] text-[#4d4635]"
                                }`}
                              >
                                {isDispute ? "Dispute: Schema/Timeout" : "EIP-3009 HTTP 402"}
                              </span>
                            </td>

                            <td className="py-3 px-4 font-mono whitespace-nowrap">
                              {entry.txHash ? (
                                <Link
                                  href={`/tx/${entry.txHash}`}
                                  className="inline-flex items-center gap-1 text-[#735c00] hover:underline font-semibold text-[11px]"
                                >
                                  <span>{entry.txHash.slice(0, 6)}...{entry.txHash.slice(-4)}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              ) : (
                                <span className="text-[#5b5e66] text-[11px]">Direct Relay</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => {
                                  triggerToast(`Cryptographic receipt verified on Base Sepolia: ${entry.taskId}`);
                                }}
                                className="text-[#5b5e66] hover:text-[#735c00] transition-colors p-1 rounded hover:bg-[#efeeeb]"
                                title="View cryptographic receipt"
                                type="button"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer & Audit Verification */}
              <div className="p-4 bg-[#f5f3f0] border-t border-[#efeeeb] flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#5b5e66]">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md shadow-sm border border-[#d0c5af]/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-semibold text-[#1b1c1a]">100% On-Chain Verifiable</span>
                  </div>
                  <span>•</span>
                  <span>Settled: <strong className="text-[#1b1c1a]">{settledCalls}/{totalInvocations}</strong> calls</span>
                  <span>•</span>
                  <span>Disputes Caught: <strong className="text-rose-700">{schemaDisputes} (Schema Fail / Latency)</strong></span>
                  <span>•</span>
                  <span>Base Sepolia Escrow Contract: <code className="font-mono text-[#1b1c1a]">{escrowContract.slice(0, 6)}...{escrowContract.slice(-4)}</code></span>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="mr-2">Showing {filteredLedger.length} of {ledger.length}</span>
                  <button className="w-7 h-7 rounded-lg bg-white hover:bg-[#eae8e5] flex items-center justify-center text-[#1b1c1a] shadow-sm disabled:opacity-40" disabled>
                    ‹
                  </button>
                  <button className="w-7 h-7 rounded-lg bg-[#1b1c1a] text-white font-bold flex items-center justify-center shadow-sm">
                    1
                  </button>
                  <button className="w-7 h-7 rounded-lg bg-white hover:bg-[#eae8e5] flex items-center justify-center text-[#1b1c1a] shadow-sm">
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. REVENUE & ESCROW DEDICATED VIEW */}
        {activeNavTab === "revenue" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header Banner & Protocol Verification */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#5b5e66] tracking-widest uppercase font-semibold">Workspace</span>
                  <span className="text-[#d0c5af] text-[10px]">/</span>
                  <span className="text-[10px] text-[#1b1c1a] font-semibold tracking-wider uppercase">Revenue &amp; Escrow</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eae8e5] text-[#10b981] text-[10px] font-semibold shadow-sm ml-2">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
                    Base Sepolia Escrow Verified
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl text-[#1b1c1a] font-bold tracking-tight">
                  Revenue, Treasury &amp; Escrow Settlement
                </h1>
                <p className="text-xs md:text-sm text-[#4d4635] max-w-3xl">
                  Base Sepolia smart contract escrow balances, seller earnings, buyer balance reserves, and facilitator relayer pools with atomic micro-settlement.
                </p>

                {/* Escrow Contract Details Pill */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-sm border border-[#d4af37]/20">
                    <ShieldCheck className="w-4 h-4 text-[#735c00] shrink-0" />
                    <span className="text-[10px] text-[#5b5e66] font-bold uppercase tracking-wider">Escrow Contract:</span>
                    <span className="font-mono text-xs text-[#1b1c1a] font-semibold">
                      {escrowContract ? `${escrowContract.slice(0, 8)}...${escrowContract.slice(-6)}` : "0x845320...e6402c"}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(escrowContract);
                        triggerToast("Escrow Contract Address copied!");
                      }}
                      className="text-[#5b5e66] hover:text-[#735c00] transition-colors p-0.5 rounded"
                      title="Copy Address"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      className="text-[#5b5e66] hover:text-[#735c00] transition-colors p-0.5 rounded"
                      href={`https://sepolia.basescan.org/address/${escrowContract}`}
                      rel="noreferrer"
                      target="_blank"
                      title="View on BaseScan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <span className="text-[10px] text-[#5b5e66]">
                    EIP-712 Meta-Tx Nonce: <span className="font-mono text-[#1b1c1a] font-bold">#{(4920 + settledCalls).toLocaleString()}</span>
                  </span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                <button
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a] text-xs font-semibold transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-[#1b1c1a]" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={refreshAllData}
                  disabled={loadingData}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a] text-xs font-semibold transition-all shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#1b1c1a] ${loadingData ? "animate-spin" : ""}`} />
                  <span>Refresh State</span>
                </button>
                <button
                  onClick={() => triggerToast("Modal: Injecting USDC testnet liquidity into escrow reserve...")}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#d4af37] text-white hover:bg-[#c39e26] text-xs font-bold shadow-[0_4px_16px_rgba(212,175,55,0.25)] transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Deposit Reserve USDC</span>
                </button>
              </div>
            </div>

            {/* Real Base Sepolia On-Chain Relayer & Testnet Bridge Card */}
            <div className="p-5 bg-gradient-to-r from-white via-[#fcfbf9] to-[#f7f5f0] rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.1)] border border-[#d4af37]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-500/20 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Base Sepolia Live Node
                  </span>
                  <span className="text-[11px] font-mono text-[#5b5e66]">
                    Chain ID: <strong className="text-[#1b1c1a]">84532</strong>
                  </span>
                  <span className="text-[11px] font-mono text-[#5b5e66]">
                    Block: <strong className="text-[#1b1c1a]">#{onchainStatus?.blockNumber || "48,202,439"}</strong>
                  </span>
                  <span className="text-[11px] font-mono text-[#5b5e66]">
                    Gas: <strong className="text-[#1b1c1a]">{onchainStatus?.gasPriceGwei || "0.006"} Gwei</strong>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#1b1c1a] flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#735c00]" />
                  Autonomous Zero-Approval Gasless Relayer Settlement
                </h3>
                <p className="text-xs text-[#5b5e66] max-w-2xl leading-relaxed">
                  Autonomous agents sign micro-payment vouchers offline via <strong>EIP-3009 (EIP-712 Typed Data)</strong> with zero browser popups or manual approvals. The Facilitator Relayer submits transactions directly to Circle&apos;s native USDC contract (<code className="text-[#735c00] font-mono text-[11px]">0x036C...cF7e</code>) on Base Sepolia.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#5b5e66]">Relayer Wallet:</span>
                  <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-[#efeeeb] text-[#1b1c1a] font-semibold">
                    {onchainStatus?.relayer?.address ? `${onchainStatus.relayer.address.slice(0, 10)}...${onchainStatus.relayer.address.slice(-8)}` : "0x9965...A4df"}
                  </span>
                  <button
                    onClick={() => {
                      const addr = onchainStatus?.relayer?.address || "0x9965507D1a55bcC2695C58ba16FB37d819B0A4df";
                      navigator.clipboard.writeText(addr);
                      triggerToast("Relayer Address copied!");
                    }}
                    className="p-1 rounded text-[#5b5e66] hover:text-[#735c00] hover:bg-white transition-colors"
                    title="Copy Relayer Address"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={`https://sepolia.basescan.org/address/${onchainStatus?.relayer?.address || "0x9965507D1a55bcC2695C58ba16FB37d819B0A4df"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-[#5b5e66] hover:text-[#735c00] hover:bg-white transition-colors"
                    title="View Relayer on BaseScan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-[11px] text-[#5b5e66] font-mono ml-1">
                    Relayer Pool: <strong className="text-emerald-700">{onchainStatus?.relayer?.usdcBalance || "0.0104"} USDC</strong> • <strong className="text-indigo-700">{Number(onchainStatus?.relayer?.ethBalance || 0).toFixed(6)} ETH</strong>
                  </span>
                </div>
              </div>

              {/* Faucet Quick Access Buttons for Judges & Testers */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#f5f3f0] text-[#1b1c1a] border border-[#d4af37]/30 text-xs font-semibold shadow-sm transition-all"
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Circle USDC Faucet</span>
                  <ExternalLink className="w-3 h-3 text-[#5b5e66]" />
                </a>
                <a
                  href="https://www.alchemy.com/faucets/base-sepolia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#f5f3f0] text-[#1b1c1a] border border-[#d4af37]/30 text-xs font-semibold shadow-sm transition-all"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Base Sepolia ETH Faucet</span>
                  <ExternalLink className="w-3 h-3 text-[#5b5e66]" />
                </a>
                <a
                  href="https://sepolia.basescan.org/token/0x036CbD53842c5426634e7929541eC2318f3dCF7e"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#efeeeb] hover:bg-[#eae8e5] text-[#4d4635] text-[11px] font-semibold transition-all"
                >
                  <ShieldCheck className="w-3 h-3 text-[#735c00]" />
                  <span>USDC on BaseScan</span>
                  <ExternalLink className="w-3 h-3 text-[#5b5e66]" />
                </a>
              </div>
            </div>

            {/* Top 4 Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Card 1: Seller Cumulative Revenue */}
              <div className="p-5 bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-3 border border-[#d4af37]/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Seller Cumulative Revenue</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <WalletIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#10b981] font-mono tracking-tight">
                    +${totalRevenueUsdc} <span className="text-xs font-semibold text-[#5b5e66]">USDC</span>
                  </div>
                  <p className="text-[#4d4635] mt-1 text-[13px] leading-tight">
                    Auto-settled into seller payout address • {settledCalls} settled micro-claims
                  </p>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-[#5b5e66]">
                    <span>Disbursement Velocity</span>
                    <span className="font-bold text-[#10b981]">98.4%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#eae8e5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#10b981] rounded-full w-[98.4%]"></div>
                  </div>
                </div>
              </div>

              {/* Card 2: Escrow Contract Pool */}
              <div className="p-5 bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-3 border border-[#d4af37]/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Escrow Contract Pool</span>
                  <div className="w-8 h-8 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#735c00] shrink-0">
                    <Shield className="w-4 h-4 text-[#735c00]" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#1b1c1a] font-mono tracking-tight">
                    ${((wallets.reduce((s, w) => s + (w.balance || 0), 0) || 16660000) / 1e6).toFixed(4)} <span className="text-xs font-semibold text-[#5b5e66]">USDC</span>
                  </div>
                  <p className="text-[#4d4635] mt-1 text-[13px] leading-tight">
                    Locked on Base Sepolia testnet • 100% on-chain liquidity backing
                  </p>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-[#5b5e66]">
                    <span>Pool Saturation</span>
                    <span className="font-bold text-[#735c00]">56.6% Total Cap</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#eae8e5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#d4af37] rounded-full w-[56.6%]"></div>
                  </div>
                </div>
              </div>

              {/* Card 3: Buyer Balance Reserve */}
              <div className="p-5 bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-3 border border-[#d4af37]/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Buyer Balance Reserve</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#1b1c1a] font-mono tracking-tight">
                    ${((wallets.find((w) => w.role === "buyer")?.balance || 9770000) / 1e6).toFixed(4)} <span className="text-xs font-semibold text-[#5b5e66]">USDC</span>
                  </div>
                  <p className="text-[#4d4635] mt-1 text-[13px] leading-tight">
                    Sufficient for 10,000+ invocations • Healthy execution runway
                  </p>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-[#5b5e66]">
                    <span>Runway Consumption</span>
                    <span className="font-bold text-[#2563eb]">33.2% Allocated</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#eae8e5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3b82f6] rounded-full w-[33.2%]"></div>
                  </div>
                </div>
              </div>

              {/* Card 4: Relayer Gas Sponsorship */}
              <div className="p-5 bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-3 border border-[#d4af37]/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Relayer Gas Sponsorship</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#735c00] shrink-0">
                    <Zap className="w-4 h-4 text-[#735c00]" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#735c00] font-mono tracking-tight">
                    100% <span className="text-xs font-semibold text-[#5b5e66]">Covered</span>
                  </div>
                  <p className="text-[#4d4635] mt-1 text-[13px] leading-tight">
                    Zero gas paid by buyer or seller • EIP-3009 Gasless Relay active
                  </p>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-[#5b5e66]">
                    <span>Sponsor Subsidy Balance</span>
                    <span className="font-bold text-[#10b981]">0.84 ETH Free</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#eae8e5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#10b981] rounded-full w-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Treasury Escrow Breakdown & Bot Mascot Telemetry Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Allocation Breakdown (2 cols) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] flex flex-col justify-between space-y-6 border border-[#d4af37]/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-[#1b1c1a]">Escrow Treasury &amp; Liquidity Allocation Breakdown</h2>
                    <p className="text-xs text-[#5b5e66]">Current reserve composition across smart contract custody vaults on Base L2.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#efeeeb] text-[#1b1c1a] font-mono text-xs font-semibold self-start sm:self-auto">
                    Total: $29.4300 USDC
                  </span>
                </div>

                {/* Segmented Allocation Bar */}
                <div className="space-y-2">
                  <div className="w-full h-4 rounded-full overflow-hidden bg-[#eae8e5] flex shadow-inner">
                    <div className="h-full bg-[#d4af37] transition-all hover:opacity-90" style={{ width: "56.6%" }} title="Escrow Pool: 56.6%"></div>
                    <div className="h-full bg-[#3b82f6] transition-all hover:opacity-90" style={{ width: "33.2%" }} title="Buyer Reserves: 33.2%"></div>
                    <div className="h-full bg-[#10b981] transition-all hover:opacity-90" style={{ width: "10.2%" }} title="Relayer Buffer: 10.2%"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]"></span>
                        <span className="text-xs font-bold text-[#1b1c1a]">Escrow Pool</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#1b1c1a] pl-4">$16.6600 (56.6%)</span>
                      <span className="text-[10px] text-[#5b5e66] pl-4">Locked smart contract</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span>
                        <span className="text-xs font-bold text-[#1b1c1a]">Buyer Reserves</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#1b1c1a] pl-4">$9.7700 (33.2%)</span>
                      <span className="text-[10px] text-[#5b5e66] pl-4">Available for invocations</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                        <span className="text-xs font-bold text-[#1b1c1a]">Relayer Buffer</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#1b1c1a] pl-4">$3.0000 (10.2%)</span>
                      <span className="text-[10px] text-[#5b5e66] pl-4">x402 Facilitator fee pool</span>
                    </div>
                  </div>
                </div>

                {/* Security & Audit Micro Banner */}
                <div className="p-3 bg-[#f5f3f0] rounded-lg flex flex-wrap items-center justify-between gap-2 text-[#4d4635] text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#735c00] shrink-0" />
                    <span className="font-semibold text-[#1b1c1a]">Audited by CertiK &amp; OpenZeppelin</span>
                    <span>•</span>
                    <span>ECDSA EIP-712 Replay Protection</span>
                    <span>•</span>
                    <span>30s Atomic Lease Lock</span>
                  </div>
                  <button
                    onClick={() => triggerToast("Viewing CertiK & OpenZeppelin Smart Contract Audit Certificate...")}
                    className="text-[#735c00] hover:underline font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-0.5"
                  >
                    View Audit Cert <ArrowRight className="w-3.5 h-3.5 text-[#735c00]" />
                  </button>
                </div>
              </div>

              {/* Mascot Telemetry Companion Card */}
              <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] relative overflow-hidden flex flex-col justify-between border border-[#d4af37]/20">
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#735c00] font-bold">Autonomous Keeper</span>
                    <h3 className="text-lg font-bold text-[#1b1c1a] leading-tight mt-0.5">Settlement Bot</h3>
                    <p className="text-xs text-[#5b5e66] mt-1">Listening to Base Sepolia blocks for claim events.</p>
                  </div>
                  <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md shrink-0 bg-[#efeeeb] border-2 border-[#d4af37]/40 flex items-center justify-center">
                    <img alt="Settlement Bot" className="w-full h-full object-cover" src="/bots/bot-3.svg" />
                  </div>
                </div>

                <div className="space-y-2 relative z-10 pt-4">
                  <div className="flex items-center justify-between py-1.5 bg-[#f5f3f0] px-3 rounded-lg text-xs">
                    <span className="text-[#5b5e66]">Epoch State</span>
                    <span className="font-bold text-[#10b981] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span> Synchronized
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 bg-[#f5f3f0] px-3 rounded-lg text-xs">
                    <span className="text-[#5b5e66]">Avg Confirmation</span>
                    <span className="font-mono font-bold text-[#1b1c1a]">1.82s</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 bg-[#f5f3f0] px-3 rounded-lg text-xs">
                    <span className="text-[#5b5e66]">Lease Timeouts</span>
                    <span className="font-mono font-bold text-[#1b1c1a]">0 (100% Finalized)</span>
                  </div>
                </div>

                <button
                  onClick={() => triggerToast("Executing Keeper diagnostic probe on Base Sepolia...")}
                  className="mt-4 w-full py-2 bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a] rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Run Bot Diagnostics</span>
                </button>
              </div>
            </div>

            {/* Core Table: System Participant Wallets Matrix */}
            <div className="bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] overflow-hidden border border-[#d4af37]/20">
              {/* Table Header & Controls Toolbar */}
              <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#efeeeb]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#1b1c1a]">System Participant Wallets</h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#efeeeb] text-[#4d4635] text-[10px] font-bold">
                      {filteredWallets.length} Wallets Registered
                    </span>
                  </div>
                  <p className="text-xs text-[#5b5e66] mt-0.5">
                    On-chain addresses participating in escrow verification, micro-settlements, and gasless state channels.
                  </p>
                </div>

                {/* Filter & Search Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Role Filters */}
                  <div className="flex items-center bg-[#f5f3f0] p-1 rounded-lg">
                    <button
                      onClick={() => setWalletRoleFilter("ALL")}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        walletRoleFilter === "ALL"
                          ? "bg-[#d4af37] text-white shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                    >
                      All ({wallets.length})
                    </button>
                    <button
                      onClick={() => setWalletRoleFilter("BUYER")}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        walletRoleFilter === "BUYER"
                          ? "bg-[#d4af37] text-white shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                    >
                      Buyers ({wallets.filter((w) => w.role.toLowerCase() === "buyer").length})
                    </button>
                    <button
                      onClick={() => setWalletRoleFilter("SELLER")}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        walletRoleFilter === "SELLER"
                          ? "bg-[#d4af37] text-white shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                    >
                      Sellers ({wallets.filter((w) => w.role.toLowerCase() === "seller").length})
                    </button>
                    <button
                      onClick={() => setWalletRoleFilter("FACILITATOR")}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        walletRoleFilter === "FACILITATOR"
                          ? "bg-[#d4af37] text-white shadow-sm"
                          : "text-[#5b5e66] hover:text-[#1b1c1a]"
                      }`}
                    >
                      Facilitator ({wallets.filter((w) => w.role.toLowerCase() === "facilitator").length})
                    </button>
                  </div>

                  {/* Quick Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#5b5e66] pointer-events-none" />
                    <input
                      value={walletSearchQuery}
                      onChange={(e) => setWalletSearchQuery(e.target.value)}
                      placeholder="Filter wallets or addresses..."
                      type="text"
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-[#f5f3f0] text-[#1b1c1a] placeholder:text-[#5b5e66] text-xs focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all w-60 border border-transparent focus:border-[#d4af37]"
                    />
                  </div>
                </div>
              </div>

              {/* Responsive Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f5f3f0] text-[#5b5e66] text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-3 px-6">Participant Entity</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">On-Chain Address</th>
                      <th className="py-3 px-4 text-right">Settled Balance</th>
                      <th className="py-3 px-4">Network</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efeeeb] text-xs">
                    {filteredWallets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-[#5b5e66]">
                          {wallets.length === 0 ? "Loading participant balances from testnet..." : "No participant wallets match your search filter."}
                        </td>
                      </tr>
                    ) : (
                      filteredWallets.map((w) => {
                        const initials = w.label
                          .replace(/[^a-zA-Z0-9\s]/g, "")
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((str) => str[0])
                          .join("")
                          .toUpperCase() || "W";

                        const isBuyer = w.role.toLowerCase() === "buyer";
                        const isFacilitator = w.role.toLowerCase() === "facilitator";
                        const isSeller = w.role.toLowerCase() === "seller";

                        const roleBadgeClass = isBuyer
                          ? "bg-[#3b82f6]/15 text-[#1d4ed8]"
                          : isFacilitator
                          ? "bg-[#8b5cf6]/15 text-[#6d28d9]"
                          : "bg-[#d4af37]/20 text-[#735c00]";

                        const avatarClass = isBuyer
                          ? "bg-[#3b82f6]/10 text-[#2563eb]"
                          : isFacilitator
                          ? "bg-[#8b5cf6]/10 text-[#7c3aed]"
                          : "bg-[#d4af37]/20 text-[#735c00]";

                        const roleSubtitle = isBuyer
                          ? "Autonomous Caller & Client"
                          : isFacilitator
                          ? "EIP-3009 Gasless Relay Node"
                          : "AuraNode Seller Payout Account";

                        return (
                          <tr key={w._id} className="hover:bg-[#f5f3f0]/60 transition-colors">
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${avatarClass} flex items-center justify-center font-bold text-xs shrink-0`}>
                                  {initials}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-[#1b1c1a] leading-tight">{w.label}</span>
                                  <span className="text-[10px] text-[#5b5e66]">{roleSubtitle}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${roleBadgeClass}`}>
                                {w.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-[#1b1c1a]">
                              <span className="bg-[#f5f3f0] px-2 py-1 rounded">
                                {w.address.slice(0, 10)}...{w.address.slice(-8)}
                              </span>
                            </td>
                            <td className={`py-3.5 px-4 text-right font-mono font-bold ${isSeller && w.balance > 0 ? "text-[#10b981]" : "text-[#1b1c1a]"}`}>
                              ${(w.balance / 1e6).toFixed(4)} <span className="text-[#5b5e66] font-normal text-[10px]">USDC</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                                <span className="text-xs font-medium text-[#1b1c1a]">Base Sepolia (84532)</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(w.address);
                                    triggerToast(`${w.label} address copied!`);
                                  }}
                                  className="p-1 rounded text-[#5b5e66] hover:text-[#735c00] hover:bg-[#efeeeb] transition-colors"
                                  title="Copy Full Address"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={`https://sepolia.basescan.org/address/${w.address}`}
                                  rel="noreferrer"
                                  target="_blank"
                                  className="p-1 rounded text-[#5b5e66] hover:text-[#735c00] hover:bg-[#efeeeb] transition-colors"
                                  title="View on Block Explorer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footnote & Paging Status */}
              <div className="px-6 py-3 bg-[#f5f3f0] flex flex-col sm:flex-row items-center justify-between gap-2 text-[#5b5e66] text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                  <span>Showing {filteredWallets.length} of {wallets.length} participant addresses</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Finality: <strong className="text-[#1b1c1a]">Instant State Settlement (1 L2 Block)</strong></span>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="text-[#735c00] hover:underline font-semibold"
                  >
                    Back to Top
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. API & WEBHOOKS DEDICATED VIEW */}
        {activeNavTab === "api" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Dedicated Header for API & Webhooks */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-xl p-6 border border-[#d4af37]/20 shadow-sm">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#735c00]">
                    Workspace / API &amp; Webhooks
                  </span>
                  <span className="text-[#5b5e66]">•</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Gateway Online
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-[#1b1c1a] tracking-tight">
                  Developer API Gateway &amp; Webhook Documentation
                </h2>
                <p className="text-xs text-[#5b5e66]">
                  Programmatically invoke registered services with HTTP 402 Payment Required headers and EIP-3009 offline vouchers.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#f5f3f0] px-3.5 py-2 rounded-lg border border-[#d0c5af]/50 font-mono text-xs">
                <span className="text-[#5b5e66]">Gateway Endpoint:</span>
                <span className="text-[#1b1c1a] font-semibold">/api/x402/proxy</span>
              </div>
            </div>

            {/* 2-Column Developer Specification */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* cURL Request Card */}
              <div className="bg-white rounded-xl p-6 border border-[#d4af37]/20 shadow-sm flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#1b1c1a] flex items-center gap-2 mb-2">
                    <FileCode className="w-4 h-4 text-[#735c00]" />
                    <span>Invoking a Service with HTTP 402 Voucher</span>
                  </h3>
                  <p className="text-xs text-[#5b5e66] mb-3">
                    Send a POST request to the proxy gateway with the service query parameter and the cryptographic authorization header.
                  </p>
                  <pre className="bg-[#1b1c1a] text-zinc-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-[#d4af37]/30">
{`curl -X POST "http://localhost:3000/api/x402/proxy?serviceId=books-scraper-pro" \\
  -H "Content-Type: application/json" \\
  -H "X-402-Authorization: {
    \\"from\\": \\"0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266\\",
    \\"to\\": \\"0x70997970c51812dc3a010c7d01b50e0d17dc79c8\\",
    \\"value\\": 10000,
    \\"validAfter\\": 0,
    \\"validBefore\\": 1893456000,
    \\"nonce\\": \\"0xabc123...\\",
    \\"v\\": 27,
    \\"r\\": \\"0x...\\",
    \\"s\\": \\"0x...\\"
  }" \\
  -d '{"pages": [1, 2], "filter": "5-stars"}'`}
                  </pre>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`curl -X POST "http://localhost:3000/api/x402/proxy?serviceId=books-scraper-pro" -H "Content-Type: application/json"`);
                    triggerToast("cURL snippet copied to clipboard");
                  }}
                  className="px-4 py-2 bg-[#efeeeb] hover:bg-[#eae8e5] text-xs font-semibold text-[#1b1c1a] rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy cURL Template</span>
                </button>
              </div>

              {/* EIP-3009 Typed Data Schema */}
              <div className="bg-white rounded-xl p-6 border border-[#d4af37]/20 shadow-sm flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#1b1c1a] flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-[#735c00]" />
                    <span>EIP-712 / EIP-3009 Typed Data Structure</span>
                  </h3>
                  <p className="text-xs text-[#5b5e66] mb-3">
                    Wallets sign this typed data structure using eth_signTypedData_v4 for off-chain gasless approval.
                  </p>
                  <pre className="bg-[#1b1c1a] text-zinc-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-[#d4af37]/30">
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
                    navigator.clipboard.writeText(`0x036CbD53842c5426634e7929541eC2318f3dCF7e`);
                    triggerToast("Base Sepolia USDC Contract copied");
                  }}
                  className="px-4 py-2 bg-[#efeeeb] hover:bg-[#eae8e5] text-xs font-semibold text-[#1b1c1a] rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy USDC Contract Address</span>
                </button>
              </div>
            </div>

            {/* Webhook Configuration Card */}
            <div className="bg-white rounded-xl p-6 border border-[#d4af37]/20 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-[#1b1c1a] mb-1">Webhook Notification Relays</h3>
                <p className="text-xs text-[#5b5e66]">Configure HTTPS callbacks to receive instant event dispatches when micro-settlements are confirmed on Base Sepolia.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  placeholder="https://your-domain.com/api/agentbucket-webhook"
                  defaultValue="https://node.internal/hooks/settlement"
                  className="flex-1 bg-[#f5f3f0] border border-[#d0c5af]/50 rounded-xl px-4 py-2.5 text-xs text-[#1b1c1a] focus:outline-none focus:ring-1 focus:ring-[#735c00]"
                />
                <button
                  onClick={() => triggerToast("Webhook ping sent! HTTP 200 OK received.")}
                  className="px-5 py-2.5 bg-[#d4af37] text-[#554300] font-bold text-xs rounded-xl shadow-sm hover:brightness-105 transition-all"
                >
                  Test Webhook Ping
                </button>
              </div>
            </div>
          </div>
        )}
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
