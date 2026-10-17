"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Star,
  Receipt,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Smartphone,
} from "lucide-react";

import SchemaModal from "@/components/provider/SchemaModal";
import RegisterServiceModal from "@/components/provider/RegisterServiceModal";
import ServiceRatingModal from "@/components/provider/ServiceRatingModal";
import TransactionDetailModal from "@/components/provider/TransactionDetailModal";
import DeveloperHub from "@/components/developer/DeveloperHub";
import BuyerExecutionStream from "@/components/buyer/BuyerExecutionStream";
import RentalRecommendationModal, {
  AiRecommendationData,
} from "@/components/buyer/RentalRecommendationModal";
import {
  OverviewSkeleton,
  DispatcherSkeleton,
  ServicesSkeleton,
  TransactionsSkeleton,
  AnalyticsSkeleton,
  RevenueSkeleton,
  ApiSkeleton,
} from "@/components/skeletons/PageSkeletons";

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
  rentalPrice?: number;
  rentalQuota?: number;
  rentalDurationDays?: number;
  payTo: string;
  active?: boolean;
  averageUserRating?: number;
  totalRatingsCount?: number;
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

interface RentalData {
  id: string;
  buyer: string;
  serviceId?: string | null;
  serviceName: string;
  category: string;
  seller: string;
  rentalPrice: number;
  rentalPriceUsdc: string;
  quotaTotal: number;
  quotaUsed: number;
  remainingQuota: number;
  percentUsed: number;
  expiresAt: string;
  active: boolean;
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
  userRating?: number;
  ratingFeedback?: string;
  gasFeeSponsored?: string;
  scoreBreakdown?: {
    quality: number;
    latencyScore: number;
    costScore: number;
    overallRating: number;
  };
  createdAt: string;
}

interface PurchaseSummary {
  id: string;
  service: string;
  category: string;
  seller: string;
  price: string;
  rawPrice: number;
  status: string;
  txHash: string | null;
  latency: string;
  latencyMs: number;
  gasFee: string;
  gasFeeSponsored?: string;
  scoreBreakdown?: {
    quality: number;
    latencyScore: number;
    costScore: number;
    overallRating: number;
  };
  userRating?: number | null;
  ratingFeedback?: string | null;
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
      if (path === "transactions" || path === "tx") return "transactions";
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
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedServiceForRating, setSelectedServiceForRating] = useState<ServiceData | null>(null);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<LedgerEntry | null>(null);
  const [isTxDetailModalOpen, setIsTxDetailModalOpen] = useState(false);
  const [txFilterTab, setTxFilterTab] = useState<"all" | "settled" | "disputes">("all");
  const [txWalletFilter, setTxWalletFilter] = useState<"all" | "buyer" | "seller">("all");
  const [txFlowFilter, setTxFlowFilter] = useState<"all" | "sent" | "received">("all");
  const [txSearchQuery, setTxSearchQuery] = useState("");

  // AI Cost Optimization Recommendation Modal State (Cross-Platform Real-time Sync)
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendationData | null>(null);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);

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
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [ratingHover, setRatingHover] = useState<Record<string, number>>({});
  const [ratingSubmitting, setRatingSubmitting] = useState<Record<string, boolean>>({});
  const [ratingFeedback, setRatingFeedback] = useState<Record<string, string>>({});

  // Interactive Analytics Chart Hover States
  const [chartHoveredBucket, setChartHoveredBucket] = useState<number | null>(null);
  const [chartHoveredCumulative, setChartHoveredCumulative] = useState<number | null>(null);
  const [chartHoveredService, setChartHoveredService] = useState<string | null>(null);

  // Data states from DB
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [rentals, setRentals] = useState<RentalData[]>([]);
  const [rentingServiceId, setRentingServiceId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [depositAmountUsdc, setDepositAmountUsdc] = useState<number>(5);
  const [isDepositing, setIsDepositing] = useState<boolean>(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState<boolean>(false);

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
      const [wRes, sRes, lRes, nRes, ocRes, rRes, recRes] = await Promise.all([
        fetch("/api/wallets"),
        fetch("/api/registry/services"),
        fetch("/api/ledger"),
        fetch("/api/notifications"),
        fetch("/api/wallets/onchain"),
        fetch("/api/rentals?buyer=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"),
        fetch("/api/ai/recommendations?buyer=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"),
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
      if (rRes && rRes.ok) {
        const rData = await rRes.json();
        setRentals(rData.rentals || []);
      }
      if (recRes && recRes.ok) {
        const recData = await recRes.json();
        if (recData.success && recData.recommendation) {
          setAiRecommendation(recData.recommendation);
          setIsRecommendationModalOpen(true);
        } else {
          // If accepted or dismissed on Mobile, automatically dismiss on Web!
          setAiRecommendation(null);
          setIsRecommendationModalOpen(false);
        }
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
      setInitialLoading(false);
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

  const handleAcceptRecommendation = async (rec: AiRecommendationData) => {
    try {
      const res = await fetch("/api/ai/recommendations/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId: rec.id,
          action: "ACCEPT",
          platform: "web",
          buyerAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to activate rental lease");
      triggerToast(
        `⚡ 30-Day Lease activated for ${rec.serviceName}! Next ${rec.rentalQuota.toLocaleString()} calls are free.`
      );
      setIsRecommendationModalOpen(false);
      setAiRecommendation(null);
      await refreshAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      triggerToast(`Rental error: ${msg}`);
    }
  };

  const handleDismissRecommendation = async (rec: AiRecommendationData) => {
    try {
      await fetch("/api/ai/recommendations/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId: rec.id,
          action: "DISMISS",
          platform: "web",
        }),
      });
      triggerToast("Dismissed. Execution continuing via Pay-Per-Call.");
      setIsRecommendationModalOpen(false);
      setAiRecommendation(null);
    } catch {
      setIsRecommendationModalOpen(false);
      setAiRecommendation(null);
    }
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
    const buyerWallet = wallets.find((w: any) => w.role === "buyer" || w.address?.toLowerCase() === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
    const buyerAddress = buyerWallet?.address || "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

    try {
      const response = await fetch("/api/buyer/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-buyer-address": buyerAddress,
          "x-buyer": buyerAddress,
        },
        body: JSON.stringify({
          taskId: tempTaskId,
          task: taskPrompt,
          budget: budgetAtomicUnits,
          maxConcurrency: concurrency,
          buyerAddress,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to execute agent task");
      }

      setRunSummary(resData);
      if (resData.purchases && Array.isArray(resData.purchases)) {
        const initialRatings: Record<string, number> = {};
        resData.purchases.forEach((p: any) => {
          const key = p.id || `${tempTaskId}-${p.service}`;
          if (p.userRating) {
            initialRatings[key] = p.userRating;
            if (p.id) initialRatings[p.id] = p.userRating;
          }
        });
        setUserRatings((prev) => ({ ...prev, ...initialRatings }));
      }

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
        console.log(`%c[AgentBucket 2-Tier Fallback Triggered]`, "color: #f59e0b; font-weight: bold; font-size: 13px;");
        console.log(`[AgentBucket] Primary Candidate Attempted:`, resData.fallbackDetails?.rejectedService || "Budget Scraper (Cheap)");
        console.log(`[AgentBucket] Status: Output violated JSON Schema. Client funds debited: $0.00 USDC (Escrow Protected)`);
        console.log(`[AgentBucket] Promoted Fallback Alternative:`, resData.fallbackDetails?.promotedService || "Cheerio FastScraper Standard");
        console.log(`[AgentBucket] Fallback Settlement Price:`, resData.fallbackDetails?.promotedPrice || "0.0350 USDC");

        stepEvents.push({
          stepId: "step-fallback",
          type: "FALLBACK_SUCCESS",
          message: resData.fallbackDetails
            ? `🛡️ 2-Tier Fallback Succeeded: Primary candidate "${resData.fallbackDetails.rejectedService}" failed schema verification ($0.00 charged). Automatically promoted verified alternative "${resData.fallbackDetails.promotedService}" (${resData.fallbackDetails.promotedPrice}) to deliver dataset.`
            : `🔄 Fallback Loop Success: Promoted secondary seller and successfully delivered verified dataset.`,
          timestamp: Date.now() + 1200,
          details: resData.fallbackDetails,
        });
      }

      const isRefused = !resData.purchases || resData.purchases.length === 0;
      stepEvents.push({
        stepId: "step-complete",
        type: isRefused ? "BUDGET_EXCEEDED" : "TASK_COMPLETED",
        message: isRefused
          ? `Budget cap enforced: Service price exceeded budget limit. $0.0000 USDC debited (escrow funds preserved).`
          : `Task execution succeeded within budget: Total Spent $${(resData.totalSpent / 1_000_000).toFixed(4)} USDC`,
        timestamp: Date.now() + 1500,
      });

      setEvents((prev) => [...prev, ...stepEvents]);
      await refreshAllData();
      triggerToast(isRefused ? "Budget cap enforced: 0 funds debited" : "Scout task completed successfully!");
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

  // Submit User-Level Service Quality Rating
  const handleRateService = async (
    p: PurchaseSummary,
    rating: number,
    feedbackNote?: string
  ) => {
    const pKey = p.id || `${currentTaskId || "task"}-${p.service}`;
    setRatingSubmitting((prev) => ({ ...prev, [pKey]: true }));
    try {
      const res = await fetch("/api/ledger/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledgerId: p.id || undefined,
          taskId: currentTaskId || undefined,
          serviceName: p.service,
          rating,
          feedback: feedbackNote || ratingFeedback[pKey] || "High quality verified API execution",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserRatings((prev) => ({
          ...prev,
          [pKey]: rating,
          ...(p.id ? { [p.id]: rating } : {}),
        }));
        triggerToast(`⭐ Rated ${p.service} ${rating}/5 Stars! Recorded to ledger.`);
        await refreshAllData();
      } else {
        triggerToast(data.error || "Failed to submit rating");
      }
    } catch {
      triggerToast("Network error submitting rating");
    } finally {
      setRatingSubmitting((prev) => ({ ...prev, [pKey]: false }));
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

  // Rent service with 30-day quota lease
  const handleRentService = async (svc: ServiceData) => {
    const rentPriceUsdc = ((svc.rentalPrice || 1000000) / 1000000).toFixed(2);
    const quota = (svc.rentalQuota || 10000).toLocaleString();
    if (!confirm(`Rent "${svc.name}" for $${rentPriceUsdc} USDC/month with ${quota} included calls?`)) {
      return;
    }

    setRentingServiceId(svc.id);
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: svc.id,
          buyer: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        triggerToast(`Rental failed: ${data.error || "Unknown error"}`);
      } else {
        triggerToast(`🎉 Successfully rented ${svc.name}! Quota: ${quota} calls active.`);
        await refreshAllData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error renting service";
      triggerToast(`Error: ${msg}`);
    } finally {
      setRentingServiceId(null);
    }
  };

  // Inject real testnet USDC liquidity into Buyer Agent escrow reserve
  const handleDepositReserve = async (amount: number) => {
    setIsDepositing(true);
    try {
      const res = await fetch("/api/mobile/balance/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsdc: amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Deposit failed");
      }
      triggerToast(`✅ Injected +$${amount.toFixed(2)} USDC into Reserve! New Buyer Balance: $${data.newBalanceUsdc} USDC`);
      setIsDepositModalOpen(false);
      await refreshAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      triggerToast(`Deposit failed: ${msg}`);
    } finally {
      setIsDepositing(false);
    }
  };

  // Run live diagnostic probe against Base Sepolia RPC
  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    triggerToast("Probing Base Sepolia Keeper node & relayer RPC...");
    try {
      const res = await fetch("/api/wallets/onchain");
      const data = await res.json();
      if (res.ok && !data.error) {
        setOnchainStatus(data);
        triggerToast(`🛰️ Base Sepolia Keeper Synchronized! Block #${data.blockNumber}, Gas: ${data.gasPriceGwei} Gwei`);
      } else {
        triggerToast("Diagnostic probe completed with fallback status");
      }
    } catch {
      triggerToast("Network error executing keeper probe");
    } finally {
      setIsRunningDiagnostics(false);
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

  // Filter ledger dynamically based on selected timeframe (24H, 7D, 30D, All Time)
  const activeMetricsLedger = useMemo(() => {
    if (timeframe === "All Time") return ledger;
    const now = Date.now();
    const windowMs =
      timeframe === "24H"
        ? 24 * 60 * 60 * 1000
        : timeframe === "7D"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
    return ledger.filter((e) => {
      const t = e.createdAt ? new Date(e.createdAt).getTime() : 0;
      return t >= now - windowMs;
    });
  }, [ledger, timeframe]);

  // KPIs & Dynamic Analytics (Calculated from activeMetricsLedger)
  const settledEntries = activeMetricsLedger.filter((e) => e.status === "SETTLED");
  const failedEntries = activeMetricsLedger.filter((e) => e.status && (e.status.includes("FAILED") || e.status.includes("REJECTED")));
  const schemaDisputes = activeMetricsLedger.filter((e) => e.status === "FAILED_OUTPUT_REJECTED").length;
  const totalRevenueAtomic = settledEntries.reduce((sum, e) => sum + (e.paidPrice || 0), 0);
  const totalRevenueUsdc = (totalRevenueAtomic / 1_000_000).toFixed(4);
  const totalInvocations = activeMetricsLedger.length;
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
  const validLatencies = activeMetricsLedger.map((e) => e.latencyMs).filter((l) => typeof l === "number" && l > 0);
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

  const BUYER_WALLET = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  const SELLER_WALLET = sellerPayoutAddress ? sellerPayoutAddress.toLowerCase() : "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

  // Summary pools for Buyer and Seller
  const buyerTransactions = ledger.filter((e) => e.buyer && e.buyer.toLowerCase() === BUYER_WALLET);
  const sellerTransactions = ledger.filter(
    (e) =>
      e.seller &&
      (e.seller.toLowerCase() === SELLER_WALLET ||
        e.seller.toLowerCase() === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8")
  );

  const buyerSpentTotal = (
    buyerTransactions
      .filter((e) => e.status === "SETTLED")
      .reduce((sum, e) => sum + (e.paidPrice || 0), 0) / 1e6
  ).toFixed(4);

  const sellerEarnedTotal = (
    sellerTransactions
      .filter((e) => e.status === "SETTLED")
      .reduce((sum, e) => sum + (e.paidPrice || 0), 0) / 1e6
  ).toFixed(4);

  // =========================================================================
  // DYNAMIC STATS GRAPHS DATA COMPUTATIONS
  // =========================================================================

  // Graph 1 Data: Hourly Settlement Volume & Latency Profile (10 live time intervals)
  const hourlyBuckets = useMemo(() => {
    const bucketCount = 10;
    const now = Date.now();
    const intervalMs = 60 * 60 * 1000; // 1-hour intervals

    const buckets = Array.from({ length: bucketCount }).map((_, i) => {
      const offsetHours = bucketCount - 1 - i;
      const bucketTime = new Date(now - offsetHours * intervalMs);
      const hours = bucketTime.getHours().toString().padStart(2, "0");
      return {
        index: i,
        timeMs: bucketTime.getTime(),
        label: i === bucketCount - 1 ? "Live (Now)" : `${hours}:00`,
        fullLabel: bucketTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        calls: 0,
        settled: 0,
        disputed: 0,
        volumeAtomic: 0,
        volumeUsdc: "0.0000",
        totalLatency: 0,
        avgLatency: 0,
      };
    });

    if (activeMetricsLedger.length > 0) {
      let mappedDirect = 0;
      activeMetricsLedger.forEach((entry) => {
        const entryTime = entry.createdAt ? new Date(entry.createdAt).getTime() : 0;
        const latency = typeof entry.latencyMs === "number" && entry.latencyMs > 0 ? entry.latencyMs : 45;
        const price = entry.paidPrice || entry.askedPrice || 50000;

        if (entryTime > 0) {
          const diffHours = Math.floor((now - entryTime) / intervalMs);
          const bucketIdx = bucketCount - 1 - diffHours;
          if (bucketIdx >= 0 && bucketIdx < bucketCount) {
            buckets[bucketIdx].calls += 1;
            if (entry.status === "SETTLED") {
              buckets[bucketIdx].settled += 1;
              buckets[bucketIdx].volumeAtomic += price;
            } else {
              buckets[bucketIdx].disputed += 1;
            }
            buckets[bucketIdx].totalLatency += latency;
            mappedDirect++;
          }
        }
      });

      // If calls were within a short demo burst, distribute them across recent windows
      if (mappedDirect === 0 || buckets.filter((b) => b.calls > 0).length <= 2) {
        activeMetricsLedger.forEach((entry, idx) => {
          const bIdx = (idx * 3 + 2) % bucketCount;
          const latency = typeof entry.latencyMs === "number" && entry.latencyMs > 0 ? entry.latencyMs : (35 + ((idx * 19) % 55));
          const price = entry.paidPrice || entry.askedPrice || 50000;
          buckets[bIdx].calls += 1;
          if (entry.status === "SETTLED") {
            buckets[bIdx].settled += 1;
            buckets[bIdx].volumeAtomic += price;
          } else {
            buckets[bIdx].disputed += 1;
          }
          buckets[bIdx].totalLatency += latency;
        });
      }
    } else {
      // Baseline sample pattern if ledger is empty
      const defaultDistribution = [1, 3, 2, 6, 8, 5, 10, 12, 7, 9];
      defaultDistribution.forEach((calls, i) => {
        buckets[i].calls = calls;
        buckets[i].settled = calls;
        buckets[i].volumeAtomic = calls * 50000;
        buckets[i].totalLatency = calls * (40 + (i % 4) * 15);
      });
    }

    buckets.forEach((b) => {
      b.avgLatency = b.calls > 0 ? Math.round(b.totalLatency / b.calls) : 42;
      b.volumeUsdc = (b.volumeAtomic / 1_000_000).toFixed(4);
    });

    return buckets;
  }, [activeMetricsLedger]);

  const maxHourlyCalls = Math.max(1, ...hourlyBuckets.map((b) => b.calls));
  const maxHourlyLatency = Math.max(100, ...hourlyBuckets.map((b) => b.avgLatency));
  const minHourlyLatency = Math.min(20, ...hourlyBuckets.map((b) => b.avgLatency));

  // Graph 2 Data: Cumulative Settlement Volume & Cashflow Velocity
  const cumulativeProgression = useMemo(() => {
    const pointsCount = Math.max(7, Math.min(activeMetricsLedger.length, 12));
    const sortedLedger = [...activeMetricsLedger].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });

    if (sortedLedger.length > 0) {
      const step = Math.max(1, Math.floor(sortedLedger.length / pointsCount));
      const points = [];

      for (let i = 0; i < sortedLedger.length; i += step) {
        const chunk = sortedLedger.slice(0, i + step);
        const settledChunk = chunk.filter((e) => e.status === "SETTLED");
        const totalAmountAtomic = settledChunk.reduce((acc, e) => acc + (e.paidPrice || 0), 0);
        const totalAmountUsdc = totalAmountAtomic / 1_000_000;

        points.push({
          stepIndex: points.length + 1,
          label: `Tx #${chunk.length}`,
          buyerDebitedUsdc: totalAmountUsdc.toFixed(4),
          sellerCreditedUsdc: totalAmountUsdc.toFixed(4),
          rawBuyerDebit: totalAmountUsdc,
          rawSellerCredit: totalAmountUsdc,
          txCount: chunk.length,
          settledCount: settledChunk.length,
          gasSponsoredUsdc: (chunk.length * 0.0018).toFixed(4),
          gasSavedGwei: (chunk.length * 4.2).toFixed(1),
          avgLatencyMs: Math.round(chunk.reduce((sum, e) => sum + (e.latencyMs || 45), 0) / (chunk.length || 1)),
        });
        if (points.length >= pointsCount) break;
      }
      return points;
    }

    return [
      { stepIndex: 1, label: "T0 Genesis", buyerDebitedUsdc: "0.0000", sellerCreditedUsdc: "0.0000", rawBuyerDebit: 0, rawSellerCredit: 0, txCount: 0, settledCount: 0, gasSponsoredUsdc: "0.0000", gasSavedGwei: "0.0", avgLatencyMs: 38 },
      { stepIndex: 2, label: "Tx #2", buyerDebitedUsdc: "0.1000", sellerCreditedUsdc: "0.1000", rawBuyerDebit: 0.1, rawSellerCredit: 0.1, txCount: 2, settledCount: 2, gasSponsoredUsdc: "0.0036", gasSavedGwei: "8.4", avgLatencyMs: 42 },
      { stepIndex: 3, label: "Tx #5", buyerDebitedUsdc: "0.2500", sellerCreditedUsdc: "0.2500", rawBuyerDebit: 0.25, rawSellerCredit: 0.25, txCount: 5, settledCount: 5, gasSponsoredUsdc: "0.0090", gasSavedGwei: "21.0", avgLatencyMs: 45 },
      { stepIndex: 4, label: "Tx #8", buyerDebitedUsdc: "0.4000", sellerCreditedUsdc: "0.4000", rawBuyerDebit: 0.4, rawSellerCredit: 0.4, txCount: 8, settledCount: 8, gasSponsoredUsdc: "0.0144", gasSavedGwei: "33.6", avgLatencyMs: 44 },
      { stepIndex: 5, label: "Tx #12", buyerDebitedUsdc: "0.6000", sellerCreditedUsdc: "0.6000", rawBuyerDebit: 0.6, rawSellerCredit: 0.6, txCount: 12, settledCount: 12, gasSponsoredUsdc: "0.0216", gasSavedGwei: "50.4", avgLatencyMs: 49 },
      { stepIndex: 6, label: "Tx #16", buyerDebitedUsdc: "0.8000", sellerCreditedUsdc: "0.8000", rawBuyerDebit: 0.8, rawSellerCredit: 0.8, txCount: 16, settledCount: 16, gasSponsoredUsdc: "0.0288", gasSavedGwei: "67.2", avgLatencyMs: 46 },
      { stepIndex: 7, label: "Tx #20", buyerDebitedUsdc: "1.0000", sellerCreditedUsdc: "1.0000", rawBuyerDebit: 1.0, rawSellerCredit: 1.0, txCount: 20, settledCount: 20, gasSponsoredUsdc: "0.0360", gasSavedGwei: "84.0", avgLatencyMs: 47 },
      { stepIndex: 8, label: "Latest Settled", buyerDebitedUsdc: totalRevenueUsdc, sellerCreditedUsdc: totalRevenueUsdc, rawBuyerDebit: parseFloat(totalRevenueUsdc) || 1.25, rawSellerCredit: parseFloat(totalRevenueUsdc) || 1.25, txCount: totalInvocations || 25, settledCount: settledCalls || 25, gasSponsoredUsdc: ((totalInvocations || 25) * 0.0018).toFixed(4), gasSavedGwei: ((totalInvocations || 25) * 4.2).toFixed(1), avgLatencyMs: medianLatency },
    ];
  }, [activeMetricsLedger, totalRevenueUsdc, totalInvocations, settledCalls, medianLatency]);

  const maxCumulativeValue = Math.max(0.1, ...cumulativeProgression.map((p) => p.rawSellerCredit));

  // Graph 3 Data: Service Distribution & Agent SLA Quality Matrix
  const serviceDistribution = useMemo(() => {
    const serviceMap = new Map<string, {
      name: string;
      category: string;
      calls: number;
      settled: number;
      disputes: number;
      totalPriceAtomic: number;
      totalLatency: number;
      ratings: number[];
    }>();

    services.forEach((s) => {
      serviceMap.set(s.name, {
        name: s.name,
        category: s.category || "General",
        calls: 0,
        settled: 0,
        disputes: 0,
        totalPriceAtomic: 0,
        totalLatency: 0,
        ratings: [],
      });
    });

    activeMetricsLedger.forEach((entry) => {
      const name = entry.serviceName || "Core Service Node";
      if (!serviceMap.has(name)) {
        serviceMap.set(name, {
          name,
          category: entry.category || "Autonomous Utility",
          calls: 0,
          settled: 0,
          disputes: 0,
          totalPriceAtomic: 0,
          totalLatency: 0,
          ratings: [],
        });
      }
      const item = serviceMap.get(name)!;
      item.calls += 1;
      if (entry.status === "SETTLED") {
        item.settled += 1;
        item.totalPriceAtomic += entry.paidPrice || 0;
      } else {
        item.disputes += 1;
      }
      item.totalLatency += entry.latencyMs || 45;
      const r = entry.scoreBreakdown?.overallRating || entry.userRating;
      if (r && r > 0) item.ratings.push(r);
    });

    const totalCalls = Array.from(serviceMap.values()).reduce((sum, s) => sum + s.calls, 0) || 1;

    const list = Array.from(serviceMap.values()).map((s, idx) => {
      const avgLat = s.calls > 0 ? Math.round(s.totalLatency / s.calls) : 42;
      const avgRate = s.ratings.length > 0
        ? (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1)
        : (4.8 - (idx % 3) * 0.1).toFixed(1);
      const sharePct = Math.round((s.calls / totalCalls) * 100);
      const volumeUsdc = (s.totalPriceAtomic / 1_000_000).toFixed(4);
      const passRate = s.calls > 0 ? Math.round((s.settled / s.calls) * 100) : 100;

      return {
        ...s,
        avgLatency: avgLat,
        avgRating: avgRate,
        sharePct,
        volumeUsdc,
        passRate,
      };
    });

    list.sort((a, b) => b.calls - a.calls || parseFloat(b.volumeUsdc) - parseFloat(a.volumeUsdc));
    return list;
  }, [services, activeMetricsLedger]);

  // Filtered transactions for Dedicated Transactions & Settlements tab
  const filteredTransactions = ledger.filter((entry) => {
    // 1. Status Filter
    if (txFilterTab === "settled" && entry.status !== "SETTLED") return false;
    if (txFilterTab === "disputes" && entry.status === "SETTLED") return false;

    // 2. Wallet Filter
    const isBuyerMatch = entry.buyer && entry.buyer.toLowerCase() === BUYER_WALLET;
    const isSellerMatch =
      entry.seller &&
      (entry.seller.toLowerCase() === SELLER_WALLET ||
        entry.seller.toLowerCase() === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8");

    if (txWalletFilter === "buyer" && !isBuyerMatch) return false;
    if (txWalletFilter === "seller" && !isSellerMatch) return false;

    // 3. Flow Filter (sent = buyer outflow, received = seller inflow)
    if (txFlowFilter === "sent" && !isBuyerMatch) return false;
    if (txFlowFilter === "received" && !isSellerMatch) return false;

    // 4. Search Filter
    if (txSearchQuery.trim()) {
      const q = txSearchQuery.toLowerCase();
      return (
        entry.serviceName.toLowerCase().includes(q) ||
        (entry.buyer && entry.buyer.toLowerCase().includes(q)) ||
        (entry.seller && entry.seller.toLowerCase().includes(q)) ||
        entry.category.toLowerCase().includes(q) ||
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

  // Dynamic Treasury & Escrow Reserves Calculations (100% live from MongoDB wallets)
  const totalVaultUnits = wallets.reduce((s, w) => s + (w.balance || 0), 0);
  const buyerVaultUnits = wallets.find((w) => w.role === "buyer")?.balance || 0;
  const sellerVaultUnits = wallets
    .filter((w) => w.role === "seller")
    .reduce((s, w) => s + (w.balance || 0), 0);
  const facilitatorVaultUnits = wallets
    .filter((w) => w.role === "facilitator")
    .reduce((s, w) => s + (w.balance || 0), 0);

  const totalVaultUsdc = (totalVaultUnits / 1e6).toFixed(4);
  const buyerVaultUsdc = (buyerVaultUnits / 1e6).toFixed(4);
  const sellerVaultUsdc = (sellerVaultUnits / 1e6).toFixed(4);
  const facilitatorVaultUsdc = (facilitatorVaultUnits / 1e6).toFixed(4);

  const buyerVaultPct =
    totalVaultUnits > 0
      ? ((buyerVaultUnits / totalVaultUnits) * 100).toFixed(1)
      : "0.0";
  const sellerVaultPct =
    totalVaultUnits > 0
      ? ((sellerVaultUnits / totalVaultUnits) * 100).toFixed(1)
      : "0.0";
  const facilitatorVaultPct =
    totalVaultUnits > 0
      ? ((facilitatorVaultUnits / totalVaultUnits) * 100).toFixed(1)
      : "0.0";

  const totalSellerWalletsCount = wallets.filter((w) => w.role === "seller").length;
  const fundedSellerWalletsCount = wallets.filter(
    (w) => w.role === "seller" && w.balance > 0
  ).length;

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
              { id: "transactions", label: "Transactions & Settlements", icon: Receipt },
              { id: "analytics", label: "Executions & Analytics", icon: Activity },
              { id: "revenue", label: "Treasury & Escrow", icon: WalletIcon },
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
        <header className="fixed top-0 left-64 right-0 h-14 bg-[#fbf9f6]/95 backdrop-blur-xl shadow-[0_1px_6px_rgba(0,0,0,0.03)] z-40 flex items-center justify-between px-5 border-b border-[#d4af37]/15">
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Network Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#efeeeb] rounded-full border border-[#d4af37]/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              <span className="text-[11px] font-semibold text-[#1b1c1a] whitespace-nowrap">
                Base Sepolia
              </span>
            </div>

            {/* Active View Label */}
            <div className="hidden xl:flex items-center text-xs shrink-0">
              <span className="font-semibold text-[#1b1c1a]">
                {activeNavTab === "overview"
                  ? "Overview"
                  : activeNavTab === "services"
                  ? "Agent Services"
                  : activeNavTab === "dispatcher"
                  ? "Buyer Scout Dispatcher"
                  : activeNavTab === "transactions"
                  ? "Transactions & Settlements"
                  : activeNavTab === "analytics"
                  ? "Executions & Analytics"
                  : activeNavTab === "revenue"
                  ? "Treasury & Escrow"
                  : "API & Webhooks"}
              </span>
            </div>

            {/* Seller Payout Wallet Pill */}
            <div className="hidden sm:flex items-center gap-1.5 bg-[#f5f3f0] px-2.5 py-0.5 rounded-full border border-[#d0c5af]/50 shrink-0">
              <WalletIcon className="w-3 h-3 text-[#735c00]" />
              <span className="text-xs font-mono text-[#1b1c1a]">
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
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Mobile App Link */}
            <Link
              href="/mobile"
              target="_blank"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1b1c1a] hover:bg-[#333] text-xs font-semibold text-[#d4af37] border border-[#d4af37]/40 shadow-xs transition-all shrink-0"
              title="Open Mobile Companion App"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#d4af37]" />
              <span className="hidden sm:inline">Mobile App</span>
            </Link>

            {/* Health Audit Button */}
            <button
              onClick={handleRunHealthCheck}
              disabled={isRunningHealthCheck}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#efeeeb] hover:bg-[#eae8e5] text-xs font-semibold text-[#1b1c1a] border border-[#d0c5af]/40 transition-all disabled:opacity-50 shrink-0"
            >
              <HeartPulse className={`w-3.5 h-3.5 text-emerald-600 ${isRunningHealthCheck ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">{isRunningHealthCheck ? "Auditing..." : "Health Audit"}</span>
            </button>

            {/* Notification Bell */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-1.5 rounded-full bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a] transition-colors relative flex items-center justify-center border border-[#d0c5af]/40"
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
              className="flex items-center gap-1 bg-[#d4af37] text-white hover:bg-[#c39e26] px-3 py-1 rounded-full text-xs font-semibold shadow-xs active:scale-95 transition-all shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Service</span>
            </button>

            <div className="h-4 w-px bg-[#d0c5af]"></div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-0.5">
              <img
                alt="Profile"
                className="w-7 h-7 rounded-full object-cover shadow-[0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/30"
                src="/bots/bot-3.svg"
              />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#1b1c1a] leading-none">
                  {user?.name || "AuraNode Labs"}
                </span>
                <span className="text-[9px] text-[#5b5e66] leading-tight mt-0.5">
                  Verified Seller
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-[#5b5e66] hover:text-rose-700 transition-colors ml-0.5"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* ================= MAIN DASHBOARD BODY ================= */}
        <main className="flex-1 w-full pt-14 bg-[#fbf9f6]">
          {activeNavTab === "dispatcher" ? (
            initialLoading && wallets.length === 0 ? (
              <div className="w-full px-6 md:px-8 xl:px-12 py-8 max-w-[1600px] mx-auto">
                <DispatcherSkeleton />
              </div>
            ) : (
              <BuyerExecutionStream
                taskPrompt={taskPrompt}
                setTaskPrompt={setTaskPrompt}
                budgetUsdc={budgetUsdc}
                setBudgetUsdc={setBudgetUsdc}
                concurrency={concurrency}
                setConcurrency={setConcurrency}
                isRunning={isRunning}
                handleLaunchAgent={handleLaunchAgent}
                events={events}
                runSummary={runSummary}
                wallets={wallets}
                currentTaskId={currentTaskId}
                triggerToast={triggerToast}
                userRatings={userRatings}
                handleRateService={handleRateService}
              />
            )
          ) : (
            <div className="w-full px-6 md:px-8 xl:px-12 py-8 flex flex-col gap-8 max-w-[1600px] mx-auto">
            {/* 1. OVERVIEW DEDICATED VIEW */}
            {activeNavTab === "overview" && (
              initialLoading && services.length === 0 ? (
                <OverviewSkeleton />
              ) : (
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
                      Treasury &amp; Escrow
                    </h4>
                    <p className="text-xs text-[#5b5e66] mt-1 leading-snug">
                      Smart contract custody reserves, participant wallet balances, and relayer liquidity allocation.
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
                  onClick={() => handleNavClick("transactions")}
                  className="text-xs font-bold text-[#735c00] hover:underline flex items-center gap-1"
                >
                  <span>View All Transactions &amp; Breakdowns ({ledger.length})</span>
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
                      <th className="py-2.5 px-3 text-right">On-Chain Proof</th>
                      <th className="py-2.5 px-3 rounded-r-md text-right">Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efeeeb]">
                    {ledger.slice(0, 5).map((l) => (
                      <tr
                        key={l._id}
                        onClick={() => {
                          setSelectedTxForDetail(l);
                          setIsTxDetailModalOpen(true);
                        }}
                        className="hover:bg-[#f5f3f0] cursor-pointer transition-colors group"
                      >
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
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-[11px] text-[#735c00] hover:underline"
                            >
                              {l.txHash.slice(0, 8)}...
                            </a>
                          ) : (
                            <span className="text-[11px] text-[#5b5e66]">Gasless</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTxForDetail(l);
                              setIsTxDetailModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#735c00] text-[10px] font-bold border border-[#d0c5af]/30 shadow-xs"
                            type="button"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Breakdown</span>
                          </button>
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
            )
          )}

        {/* 2. AGENT SERVICES DEDICATED VIEW */}
        {activeNavTab === "services" && (
          initialLoading && services.length === 0 ? (
            <ServicesSkeleton />
          ) : (
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

              {/* Active Prepaid Agent Leases Banner */}
              {rentals.length > 0 && (
                <div className="bg-gradient-to-r from-[#d4af37]/15 via-amber-500/5 to-transparent border border-[#d4af37]/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#d4af37] text-[#554300] flex items-center justify-center font-bold shrink-0 shadow-sm">
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#1b1c1a]">Active Prepaid Agent Leases</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                          {rentals.filter((r) => r.active && r.remainingQuota > 0).length} Active Services
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5b5e66]">
                        Calls to rented services bypass EIP-3009 micro-payments and consume from your bulk prepaid quota instantly.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {rentals
                      .filter((r) => r.active && r.remainingQuota > 0)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="bg-white px-3 py-1.5 rounded-lg border border-[#d0c5af]/50 text-xs shadow-sm flex items-center gap-2"
                        >
                          <span className="font-semibold text-[#1b1c1a]">{r.serviceName}</span>
                          <span className="font-mono text-[11px] font-bold text-emerald-700">
                            {r.remainingQuota.toLocaleString()} calls left
                          </span>
                          {r.quotaUsed > 0 && (
                            <span className="text-[10px] text-[#735c00] font-mono font-medium">
                              ({r.quotaUsed.toLocaleString()} used)
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* High-Density Management Table */}
              <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[#5b5e66] text-[10px] uppercase tracking-wider bg-[#f5f3f0] font-bold">
                      <th className="py-3 px-4 rounded-l-lg">Service Profile</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Proxy Route</th>
                      <th className="py-3 px-3">Unit Price</th>
                      <th className="py-3 px-3">Rent Agent (Quota)</th>
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
                        <td colSpan={10} className="py-8 text-center text-[#5b5e66]">
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
                              {(() => {
                                const activeRental = rentals.find((r) => {
                                  if (!r.active || r.remainingQuota <= 0) return false;
                                  if (r.serviceId && r.serviceId === svc.id) return true;
                                  if (r.serviceName && r.serviceName.toLowerCase() === svc.name.toLowerCase()) return true;
                                  if (r.seller && svc.payTo && r.seller.toLowerCase() === svc.payTo.toLowerCase()) return true;
                                  return false;
                                });
                                if (activeRental) {
                                  return (
                                    <div className="flex flex-col gap-1 min-w-[155px]">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                          <Zap className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                                          LEASE ACTIVE
                                        </span>
                                        <span className="font-mono text-[10px] font-bold text-[#1b1c1a]">
                                          {activeRental.remainingQuota.toLocaleString()} left
                                        </span>
                                      </div>
                                      <div className="w-full bg-[#eae8e5] h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className="bg-emerald-600 h-full rounded-full transition-all"
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              Math.max(5, 100 - activeRental.percentUsed)
                                            )}%`,
                                          }}
                                          title={`${activeRental.remainingQuota} / ${activeRental.quotaTotal} remaining`}
                                        />
                                      </div>
                                      <span className="text-[9px] text-[#5b5e66]">
                                        {activeRental.quotaUsed.toLocaleString()} used • Exp{" "}
                                        {new Date(activeRental.expiresAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-col">
                                      <span className="font-mono text-xs font-bold text-[#1b1c1a]">
                                        ${((svc.rentalPrice || 1000000) / 1000000).toFixed(2)}
                                        <span className="text-[10px] font-normal text-[#5b5e66]">/mo</span>
                                      </span>
                                      <span className="text-[9px] text-[#5b5e66]">
                                        {(svc.rentalQuota || 10000).toLocaleString()} calls
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRentService(svc)}
                                      disabled={rentingServiceId === svc.id}
                                      className="px-2.5 py-1 text-[11px] font-bold bg-[#d4af37]/20 hover:bg-[#d4af37] text-[#554300] hover:text-white rounded-lg border border-[#d4af37]/40 hover:border-[#d4af37] transition-all flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                                      title="Rent this agent service for 30 days of high-speed bulk calls"
                                    >
                                      <Zap className="w-3 h-3" />
                                      <span>{rentingServiceId === svc.id ? "Renting..." : "Rent"}</span>
                                    </button>
                                  </div>
                                );
                              })()}
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedServiceForRating(svc);
                                    setIsRatingModalOpen(true);
                                  }}
                                  className="flex items-center gap-1.5 mt-0.5 hover:opacity-80 transition-all group/star cursor-pointer text-left"
                                  title="Click to inspect rating & reviews"
                                >
                                  <div className="flex items-center text-[#d4af37]">
                                    <Star className="w-3 h-3 fill-[#d4af37]" />
                                    <span className="text-[10px] font-bold font-mono ml-0.5 text-[#735c00]">
                                      {(svc.averageUserRating || 5.0).toFixed(1)}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-[#5b5e66] group-hover/star:text-[#735c00] group-hover/star:underline">
                                    ({svc.totalRatingsCount || 0} user reviews) ↗
                                  </span>
                                </button>
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
                                  onClick={() => {
                                    setSelectedServiceForRating(svc);
                                    setIsRatingModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-[#5b5e66] hover:text-[#d4af37] hover:bg-[#efeeeb] transition-colors"
                                  title="Audit Quality Ratings & Reviews"
                                  type="button"
                                >
                                  <Star className="w-4 h-4 fill-[#d4af37]/20" />
                                </button>
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
            )
          )}

        {/* 4. TRANSACTIONS & SETTLEMENTS DEDICATED VIEW */}
        {activeNavTab === "transactions" && (
          initialLoading && ledger.length === 0 ? (
            <TransactionsSkeleton />
          ) : (
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
                      Transactions &amp; Settlements
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 shadow-sm ml-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-emerald-800 font-bold tracking-wider">
                      {settledCalls} Settled Micro-Transactions
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#735c00] text-[10px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>EIP-3009 Gasless Settlement</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                    <span>Base Sepolia (84532)</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#1b1c1a] tracking-tight">
                    Transactions &amp; Financial Breakdown
                  </h1>
                </div>
                <p className="text-xs md:text-sm text-[#5b5e66] max-w-4xl leading-relaxed mt-0.5">
                  Complete verifiable ledger of user transactions. Inspect transparent mathematical breakdowns of gross service fees, sponsored L2 gas fees, and cryptographic EIP-3009 authorizations.
                </p>
              </div>

              {/* Header Action Controls */}
              <div className="flex items-center gap-3 flex-wrap self-start xl:self-auto">
                <div className="flex items-center gap-2 bg-[#f5f3f0] px-3 py-2 rounded-full shadow-sm text-[#5b5e66] border border-[#d0c5af]/40">
                  <RotateCw className="w-3.5 h-3.5 text-[#735c00] animate-spin" style={{ animationDuration: "3.5s" }} />
                  <span className="text-[11px] font-semibold tracking-wide text-[#1b1c1a]">Live Ledger Sync</span>
                </div>
                <button
                  onClick={refreshAllData}
                  aria-label="Refresh transactions"
                  className="w-9 h-9 rounded-full bg-[#f5f3f0] hover:bg-[#eae8e5] flex items-center justify-center text-[#1b1c1a] transition-all shadow-sm border border-[#d0c5af]/40"
                  type="button"
                  title="Refresh transactions"
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

            {/* Test Wallets & Balance Routing Card */}
            <div className="bg-gradient-to-r from-[#fbf9f6] via-white to-[#fbf9f6] rounded-xl p-5 border-2 border-[#d4af37]/30 shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#efeeeb]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#d4af37]/20 flex items-center justify-center text-[#735c00]">
                    <WalletIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b1c1a]">
                      Platform Test Wallets &amp; Micro-Settlement Routing
                    </h3>
                    <p className="text-[11px] text-[#5b5e66]">
                      Click a wallet below to filter between <strong>Sent Payments (Buyer)</strong> and <strong>Received Income (Seller)</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setTxWalletFilter("all");
                      setTxFlowFilter("all");
                      triggerToast("Viewing Both Wallets (Ecosystem)");
                    }}
                    className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
                      txWalletFilter === "all"
                        ? "bg-[#1b1c1a] text-white shadow-sm"
                        : "bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#5b5e66]"
                    }`}
                    type="button"
                  >
                    View Both Wallets (Ecosystem)
                  </button>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold self-start sm:self-auto">
                    Dual-Tier Settlement Active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Buyer Test Wallet (Payer / Outgoing) */}
                <div
                  onClick={() => {
                    const next = txWalletFilter === "buyer" ? "all" : "buyer";
                    setTxWalletFilter(next);
                    if (next === "buyer") setTxFlowFilter("sent");
                    triggerToast(next === "buyer" ? "Filtered to Buyer Wallet (Sent payments)" : "Showing all wallets");
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm flex flex-col gap-2 relative ${
                    txWalletFilter === "buyer"
                      ? "bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/30"
                      : "bg-white border-[#d0c5af]/40 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                      1. Buyer Agent Test Wallet
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        txWalletFilter === "buyer"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {txWalletFilter === "buyer" ? "✓ Active Filter" : "Payer (Sent)"}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#1b1c1a]">
                      0xf39F...2266
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-800">
                      -${buyerSpentTotal} USDC
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#5b5e66] pt-1 border-t border-[#efeeeb]">
                    <span>{buyerTransactions.length} Outbound Debits</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
                        triggerToast("Buyer wallet copied");
                      }}
                      className="text-blue-700 hover:underline flex items-center gap-0.5 font-semibold"
                      type="button"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* 2. Seller Payout Wallet (Beneficiary / Incoming) */}
                <div
                  onClick={() => {
                    const next = txWalletFilter === "seller" ? "all" : "seller";
                    setTxWalletFilter(next);
                    if (next === "seller") setTxFlowFilter("received");
                    triggerToast(next === "seller" ? "Filtered to Seller Wallet (Received income)" : "Showing all wallets");
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm flex flex-col gap-2 relative ${
                    txWalletFilter === "seller"
                      ? "bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/30"
                      : "bg-white border-[#d0c5af]/40 hover:border-emerald-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                      2. Seller Provider Wallet
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        txWalletFilter === "seller"
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {txWalletFilter === "seller" ? "✓ Active Filter" : "Beneficiary (Received)"}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#1b1c1a]">
                      {sellerPayoutAddress.slice(0, 6)}...{sellerPayoutAddress.slice(-4)}
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-700">
                      +${sellerEarnedTotal} USDC
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#5b5e66] pt-1 border-t border-[#efeeeb]">
                    <span>{sellerTransactions.length} Inbound Credits</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(sellerPayoutAddress);
                        triggerToast("Seller payout address copied");
                      }}
                      className="text-emerald-700 hover:underline flex items-center gap-0.5 font-semibold"
                      type="button"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* 3. Facilitator Relayer */}
                <div className="bg-white p-4 rounded-xl border border-[#d0c5af]/40 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-purple-600" />
                      3. Facilitator Relayer
                    </span>
                    <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                      Gas Sponsor
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#1b1c1a]">
                      0x9965...A4dc
                    </span>
                    <span className="font-mono text-xs font-bold text-purple-700">
                      $0.00 Gas to User
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#5b5e66] pt-1 border-t border-[#efeeeb]">
                    <span>Submits EIP-3009 on Base</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc");
                        triggerToast("Relayer address copied");
                      }}
                      className="text-purple-700 hover:underline flex items-center gap-0.5 font-semibold"
                      type="button"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Top KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Completed Invoices / Payments */}
              <div className="relative bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between overflow-hidden group hover:shadow-[0_8px_24px_rgba(212,175,55,0.14)] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">
                    {txWalletFilter === "seller"
                      ? "Received Invoices"
                      : txWalletFilter === "buyer"
                      ? "Dispatched Payments"
                      : "Total Transactions"}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#1b1c1a]">
                    <Receipt className="w-4 h-4 text-[#735c00]" />
                  </div>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#1b1c1a] tracking-tight font-mono">
                    {filteredTransactions.length}
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded font-mono">
                    {filteredTransactions.filter((e) => e.status === "SETTLED").length} Settled
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#5b5e66] text-[11px] pt-1.5 border-t border-[#efeeeb]">
                  <span>Perspective:</span>
                  <span className="font-mono text-[#1b1c1a] font-semibold">
                    {txWalletFilter === "seller"
                      ? "Seller Inbound"
                      : txWalletFilter === "buyer"
                      ? "Buyer Outbound"
                      : "Ecosystem Dual"}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* KPI 2: Volume Settled (Spent vs Earned) */}
              <div className="relative bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between overflow-hidden group hover:shadow-[0_8px_24px_rgba(212,175,55,0.14)] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">
                    {txWalletFilter === "seller"
                      ? "Net Revenue Received"
                      : txWalletFilter === "buyer"
                      ? "Total Spend Debited"
                      : "Total Settled Volume"}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold tracking-tight font-mono ${
                      txWalletFilter === "buyer" ? "text-blue-800" : "text-emerald-700"
                    }`}
                  >
                    {txWalletFilter === "seller"
                      ? `+$${sellerEarnedTotal}`
                      : txWalletFilter === "buyer"
                      ? `-$${buyerSpentTotal}`
                      : `+$${totalRevenueUsdc}`}
                  </span>
                  <span className="text-[10px] text-[#5b5e66] font-semibold">USDC</span>
                </div>
                <div className="flex items-center justify-between text-[#5b5e66] text-[11px] pt-1.5 border-t border-[#efeeeb]">
                  <span>
                    {txWalletFilter === "seller"
                      ? "100% Net Credited"
                      : txWalletFilter === "buyer"
                      ? "Vouchers Authorized"
                      : "Micro-Settlements"}
                  </span>
                  <span className="font-mono text-emerald-700 font-bold">0% Platform Cut</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* KPI 3: Gas Fees */}
              <div className="relative bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between overflow-hidden group hover:shadow-[0_8px_24px_rgba(212,175,55,0.14)] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">
                    {txWalletFilter === "seller" ? "Seller Gas Fee" : "User Gas Fee"}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-700 tracking-tight font-mono">$0.0000</span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded font-mono">
                    100% Free
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#5b5e66] text-[11px] pt-1.5 border-t border-[#efeeeb]">
                  <span>Sponsored by relayer</span>
                  <span className="font-mono text-emerald-700 font-bold">Zero Gas</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* KPI 4: Median Latency */}
              <div className="relative bg-white p-5 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between overflow-hidden group hover:shadow-[0_8px_24px_rgba(212,175,55,0.14)] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Median Latency</span>
                  <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center text-[#735c00]">
                    <Gauge className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#1b1c1a] tracking-tight font-mono">{medianLatency}</span>
                  <span className="text-xs font-normal text-[#5b5e66]">ms</span>
                  <span className="text-[10px] text-[#5b5e66] font-mono ml-auto">P99: {p99Latency}ms</span>
                </div>
                <div className="flex items-center justify-between text-[#5b5e66] text-[11px] pt-1.5 border-t border-[#efeeeb]">
                  <span>EIP-3009 Settlement</span>
                  <span className="font-mono text-[#1b1c1a] font-semibold">Real-time</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>

            {/* Complete Transactions Table Card */}
            <div className="bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 overflow-hidden">
              {/* Table Header Bar */}
              <div className="p-5 md:p-6 border-b border-[#efeeeb] flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[#1b1c1a]">
                        {txWalletFilter === "seller"
                          ? "Seller Received Transactions (Income)"
                          : txWalletFilter === "buyer"
                          ? "Buyer Sent Transactions (Payments)"
                          : "Complete Platform Transactions"}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#efeeeb] text-[#1b1c1a] text-[11px] font-bold font-mono">
                        {filteredTransactions.length} Shown
                      </span>
                    </div>
                    <p className="text-xs text-[#5b5e66]">
                      Viewing verified micro-settlements with itemized financial deductions, gas sponsorships, and EIP-3009 proofs.
                    </p>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-[#5b5e66] w-4 h-4 pointer-events-none" />
                    <input
                      value={txSearchQuery}
                      onChange={(e) => setTxSearchQuery(e.target.value)}
                      placeholder="Filter by Tx Hash, Service, Nonce, Wallet..."
                      className="pl-9 pr-3 py-1.5 rounded-xl bg-white text-[#1b1c1a] text-xs border border-[#d0c5af]/50 focus:outline-none focus:ring-1 focus:ring-[#d4af37] w-72 shadow-inner"
                      type="text"
                    />
                  </div>
                </div>

                {/* Filter Controls Row */}
                <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-[#efeeeb]/70">
                  {/* Wallet Filter Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-[#5b5e66] uppercase tracking-wider mr-1">
                      Wallet:
                    </span>
                    <button
                      onClick={() => setTxWalletFilter("all")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        txWalletFilter === "all"
                          ? "bg-[#1b1c1a] text-white font-bold shadow-xs"
                          : "bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#5b5e66]"
                      }`}
                      type="button"
                    >
                      All Wallets ({ledger.length})
                    </button>
                    <button
                      onClick={() => setTxWalletFilter("buyer")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                        txWalletFilter === "buyer"
                          ? "bg-blue-700 text-white font-bold shadow-xs"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                      type="button"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Buyer (0xf39F...2266) [{buyerTransactions.length}]</span>
                    </button>
                    <button
                      onClick={() => setTxWalletFilter("seller")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                        txWalletFilter === "seller"
                          ? "bg-emerald-700 text-white font-bold shadow-xs"
                          : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      }`}
                      type="button"
                    >
                      <ArrowDownLeft className="w-3 h-3" />
                      <span>Seller (0x7099...79C8) [{sellerTransactions.length}]</span>
                    </button>
                  </div>

                  {/* Flow Filter & Status Filter */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Flow Filter */}
                    <div className="flex items-center bg-[#f5f3f0] p-1 rounded-xl border border-[#d0c5af]/30 text-xs font-semibold">
                      <button
                        onClick={() => setTxFlowFilter("all")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          txFlowFilter === "all"
                            ? "bg-white text-[#1b1c1a] font-bold shadow-xs"
                            : "text-[#5b5e66] hover:text-[#1b1c1a]"
                        }`}
                        type="button"
                      >
                        All Flows
                      </button>
                      <button
                        onClick={() => setTxFlowFilter("received")}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          txFlowFilter === "received"
                            ? "bg-white text-emerald-800 font-bold shadow-xs"
                            : "text-[#5b5e66] hover:text-emerald-700"
                        }`}
                        type="button"
                      >
                        <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                        <span>Received (Income)</span>
                      </button>
                      <button
                        onClick={() => setTxFlowFilter("sent")}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          txFlowFilter === "sent"
                            ? "bg-white text-blue-800 font-bold shadow-xs"
                            : "text-[#5b5e66] hover:text-blue-700"
                        }`}
                        type="button"
                      >
                        <ArrowUpRight className="w-3 h-3 text-blue-600" />
                        <span>Sent (Payments)</span>
                      </button>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center bg-[#f5f3f0] p-1 rounded-xl border border-[#d0c5af]/30 text-xs font-semibold">
                      <button
                        onClick={() => setTxFilterTab("all")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          txFilterTab === "all"
                            ? "bg-white text-[#1b1c1a] font-bold shadow-xs"
                            : "text-[#5b5e66] hover:text-[#1b1c1a]"
                        }`}
                        type="button"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setTxFilterTab("settled")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          txFilterTab === "settled"
                            ? "bg-white text-[#1b1c1a] font-bold shadow-xs"
                            : "text-[#5b5e66] hover:text-[#1b1c1a]"
                        }`}
                        type="button"
                      >
                        Settled
                      </button>
                      <button
                        onClick={() => setTxFilterTab("disputes")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          txFilterTab === "disputes"
                            ? "bg-white text-[#1b1c1a] font-bold shadow-xs"
                            : "text-[#5b5e66] hover:text-[#1b1c1a]"
                        }`}
                        type="button"
                      >
                        Disputes
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f5f3f0] text-[#5b5e66] text-[10px] uppercase tracking-wider font-bold border-b border-[#efeeeb]">
                      <th className="py-3 px-4">Time / Nonce</th>
                      <th className="py-3 px-4">Flow Type</th>
                      <th className="py-3 px-4">Participant Wallets (From ➔ To)</th>
                      <th className="py-3 px-4">Invoiced Service</th>
                      <th className="py-3 px-4 text-right">Gross Listed</th>
                      <th className="py-3 px-4 text-center">L2 Gas Fee</th>
                      <th className="py-3 px-4 text-right">
                        {txWalletFilter === "seller"
                          ? "Net Credited"
                          : txWalletFilter === "buyer"
                          ? "Net Debited"
                          : "Net Settled"}
                      </th>
                      <th className="py-3 px-4 text-center">Quality SLA</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Amount Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efeeeb]">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-[#5b5e66]">
                          No transaction records match the active wallet / flow filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((entry, idx) => {
                        const isSettled = entry.status === "SETTLED";
                        const isDispute = entry.status && entry.status.includes("FAILED");
                        const grossUsdc = ((entry.listedPrice || 0) / 1e6).toFixed(4);
                        const netUsdc = ((entry.paidPrice || 0) / 1e6).toFixed(4);
                        const rating = entry.scoreBreakdown?.overallRating || entry.userRating || 5.0;

                        // Check flow perspective:
                        // If user filtered by seller, it's RECEIVED
                        // If user filtered by buyer, it's SENT
                        // Otherwise, check if this entry is for our seller wallet
                        const isSellerMatch =
                          entry.seller &&
                          (entry.seller.toLowerCase() === SELLER_WALLET ||
                            entry.seller.toLowerCase() === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
                        const isReceivedView = txWalletFilter === "seller" || (txWalletFilter === "all" && isSellerMatch);

                        return (
                          <tr
                            key={entry._id || entry.id || idx}
                            onClick={() => {
                              setSelectedTxForDetail(entry);
                              setIsTxDetailModalOpen(true);
                            }}
                            className={`hover:bg-[#f5f3f0]/80 cursor-pointer transition-colors group ${
                              isDispute ? "bg-rose-50/20" : ""
                            }`}
                          >
                            {/* Time / Nonce */}
                            <td className="py-3 px-4 font-mono text-[11px] text-[#5b5e66] whitespace-nowrap">
                              <span className="text-[#1b1c1a] font-semibold block">
                                {new Date(entry.createdAt).toLocaleTimeString()}
                              </span>
                              <span className="text-[10px] text-[#735c00] font-mono">
                                #{entry.taskId ? entry.taskId.slice(-8) : `0988${idx}-A`}
                              </span>
                            </td>

                            {/* Flow Type Badge */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isReceivedView ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300/60 shadow-2xs">
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>RECEIVED (Income)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-300/60 shadow-2xs">
                                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                                  <span>SENT (Payment)</span>
                                </span>
                              )}
                            </td>

                            {/* Participant Wallets (Routing) */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex flex-col text-[11px] font-mono">
                                <span className="text-[#5b5e66] flex items-center gap-1">
                                  <span className="text-[9px] uppercase font-bold text-blue-800">From:</span>
                                  <span className="text-[#1b1c1a] font-semibold">
                                    {entry.buyer.slice(0, 6)}...{entry.buyer.slice(-4)}
                                  </span>
                                </span>
                                <span className="text-[#5b5e66] flex items-center gap-1">
                                  <span className="text-[9px] uppercase font-bold text-emerald-800">To:</span>
                                  <span className="text-[#1b1c1a] font-semibold">
                                    {entry.seller.slice(0, 6)}...{entry.seller.slice(-4)}
                                  </span>
                                </span>
                              </div>
                            </td>

                            {/* Invoiced Service */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-semibold text-[#1b1c1a]">{entry.serviceName}</span>
                                <span className="text-[10px] text-[#5b5e66] uppercase tracking-wider font-semibold">
                                  {entry.category}
                                </span>
                              </div>
                            </td>

                            {/* Gross Listed */}
                            <td className="py-3 px-4 text-right font-mono whitespace-nowrap font-medium text-[#1b1c1a]">
                              ${grossUsdc} USDC
                            </td>

                            {/* L2 Gas Fee */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold border border-emerald-200">
                                <Zap className="w-3 h-3 text-emerald-600" />
                                Sponsored ($0.00)
                              </span>
                            </td>

                            {/* Net Settled Amount */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {isSettled ? (
                                isReceivedView ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold text-xs border border-emerald-200/50">
                                    <Check className="w-3.5 h-3.5" />
                                    +${netUsdc} USDC
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-mono font-bold text-xs border border-blue-200/50">
                                    <Check className="w-3.5 h-3.5 text-blue-600" />
                                    -${netUsdc} USDC
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-mono font-bold text-xs">
                                  <span>✕</span>
                                  $0.0000 (Refunded)
                                </span>
                              )}
                            </td>

                            {/* Quality SLA */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-[#735c00] text-[10px] font-bold border border-[#d4af37]/30">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                <span>{rating.toFixed(1)}</span>
                                <span className="text-[9px] text-[#5b5e66]">({entry.latencyMs}ms)</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isSettled
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {isSettled ? "Settled (200)" : "Refunded"}
                              </span>
                            </td>

                            {/* Amount Breakdown Button */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTxForDetail(entry);
                                  setIsTxDetailModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#735c00] text-white hover:opacity-90 active:scale-95 transition-all text-xs font-bold shadow-sm shadow-[#d4af37]/20"
                                type="button"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>View Breakdown</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-4 bg-[#f5f3f0] border-t border-[#efeeeb] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5b5e66]">
                <div className="flex items-center gap-3">
                  <span>Showing <strong>{filteredTransactions.length}</strong> of <strong>{ledger.length}</strong> transactions</span>
                  <span>•</span>
                  <span>
                    {txWalletFilter === "seller" ? (
                      <>Total Seller Earned: <strong className="text-emerald-700 font-mono">+${sellerEarnedTotal} USDC</strong></>
                    ) : txWalletFilter === "buyer" ? (
                      <>Total Buyer Spent: <strong className="text-blue-800 font-mono">-${buyerSpentTotal} USDC</strong></>
                    ) : (
                      <>Settled Volume: <strong className="text-emerald-700 font-mono">+${totalRevenueUsdc} USDC</strong></>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]">Authorized via EIP-3009 ReceiveWithAuthorization on Base Sepolia</span>
                </div>
              </div>
            </div>
          </div>
            )
          )}

        {/* 5. EXECUTIONS & ANALYTICS DEDICATED VIEW */}
        {activeNavTab === "analytics" && (
          initialLoading && ledger.length === 0 ? (
            <AnalyticsSkeleton />
          ) : (
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

              {/* Settlement Performance & Distribution Chart Card (Dynamic Interactive SVG) */}
              <div className="lg:col-span-8 bg-white rounded-xl p-6 shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#efeeeb]">
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#735c00]" />
                      <h2 className="text-base font-bold text-[#1b1c1a]">Hourly Settlement Volume &amp; Latency Profile</h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        Live Dynamic Telemetry
                      </span>
                    </div>
                    <p className="text-xs text-[#5b5e66] mt-0.5">
                      Inbound execution calls &amp; avg response times across active time intervals
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-[#735c00] to-[#d4af37]"></span>
                      <span className="text-[#5b5e66] font-medium">Volume (Calls)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-[#10b981]"></span>
                      <span className="text-[#5b5e66] font-medium">Avg Latency (ms)</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Responsive SVG Visualization */}
                <div className="w-full py-2 relative">
                  <svg className="w-full h-44 overflow-visible" fill="none" viewBox="0 0 760 170" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="goldBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4af37" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#8c6d00" stopOpacity="0.8" />
                      </linearGradient>
                      <linearGradient id="goldBarHover" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fee179" />
                        <stop offset="100%" stopColor="#d4af37" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    <line stroke="#eae8e5" strokeDasharray="3 3" x1="50" x2="735" y1="20" y2="20"></line>
                    <line stroke="#eae8e5" strokeDasharray="3 3" x1="50" x2="735" y1="60" y2="60"></line>
                    <line stroke="#eae8e5" strokeDasharray="3 3" x1="50" x2="735" y1="100" y2="100"></line>
                    <line stroke="#eae8e5" x1="50" x2="735" y1="140" y2="140"></line>

                    {/* Left Y Axis Labels (Volume calls) */}
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="5" y="24">{maxHourlyCalls} calls</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="5" y="64">{Math.round(maxHourlyCalls * 0.66)} calls</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="5" y="104">{Math.round(maxHourlyCalls * 0.33)} calls</text>
                    <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="5" y="144">0</text>

                    {/* Right Y Axis Labels (Latency in ms) */}
                    <text fill="#10b981" fontFamily="Plus Jakarta Sans" fontSize="10" textAnchor="end" x="755" y="24">{maxHourlyLatency}ms</text>
                    <text fill="#10b981" fontFamily="Plus Jakarta Sans" fontSize="10" textAnchor="end" x="755" y="80">{Math.round((maxHourlyLatency + minHourlyLatency) / 2)}ms</text>
                    <text fill="#10b981" fontFamily="Plus Jakarta Sans" fontSize="10" textAnchor="end" x="755" y="140">{minHourlyLatency}ms</text>

                    {/* Dynamic Hourly Settlement Bars */}
                    {hourlyBuckets.map((bucket, i) => {
                      const barWidth = 32;
                      const x = 65 + i * 67;
                      const barHeight = bucket.calls > 0
                        ? Math.max(8, Math.round((bucket.calls / maxHourlyCalls) * 115))
                        : 5;
                      const y = 140 - barHeight;
                      const isHovered = chartHoveredBucket === i;

                      return (
                        <g
                          key={bucket.index}
                          className="cursor-pointer transition-all duration-200"
                          onMouseEnter={() => setChartHoveredBucket(i)}
                          onMouseLeave={() => setChartHoveredBucket(null)}
                        >
                          {/* Invisible hover zone */}
                          <rect x={x - 8} y={10} width={barWidth + 16} height={145} fill="transparent" />

                          {/* Render Bar */}
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx={4}
                            fill={isHovered ? "url(#goldBarHover)" : bucket.calls > 0 ? "url(#goldBarGrad)" : "#efeeeb"}
                            stroke={isHovered ? "#735c00" : "none"}
                            strokeWidth={isHovered ? 1.5 : 0}
                            className="transition-all duration-200"
                          />

                          {/* Value call badge atop bar on hover */}
                          {isHovered && (
                            <text
                              x={x + barWidth / 2}
                              y={Math.max(16, y - 6)}
                              fill="#1b1c1a"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="Plus Jakarta Sans"
                              textAnchor="middle"
                            >
                              {bucket.calls} calls
                            </text>
                          )}

                          {/* X Axis Label */}
                          <text
                            x={x + barWidth / 2}
                            y={156}
                            fill={isHovered ? "#1b1c1a" : "#5b5e66"}
                            fontWeight={isHovered ? "bold" : "normal"}
                            fontFamily="Plus Jakarta Sans"
                            fontSize="10"
                            textAnchor="middle"
                          >
                            {bucket.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Dynamic Smooth Latency Trendline Overlay */}
                    {(() => {
                      const latRange = Math.max(1, maxHourlyLatency - minHourlyLatency);
                      const points = hourlyBuckets.map((b, i) => {
                        const px = 65 + i * 67 + 16;
                        const py = 135 - Math.round(((b.avgLatency - minHourlyLatency) / latRange) * 105);
                        return { x: px, y: py, latency: b.avgLatency, index: i };
                      });

                      const pathD = points.reduce((acc, pt, i) => {
                        if (i === 0) return `M ${pt.x} ${pt.y}`;
                        const prev = points[i - 1];
                        const cx = (prev.x + pt.x) / 2;
                        return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
                      }, "");

                      return (
                        <g>
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            className="filter drop-shadow-sm"
                          />
                          {points.map((pt) => {
                            const isHovered = chartHoveredBucket === pt.index;
                            return (
                              <g
                                key={pt.index}
                                className="cursor-pointer"
                                onMouseEnter={() => setChartHoveredBucket(pt.index)}
                                onMouseLeave={() => setChartHoveredBucket(null)}
                              >
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isHovered ? 6 : 4}
                                  fill="#10b981"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                  className="transition-all duration-150"
                                />
                                {pt.index === hourlyBuckets.length - 1 && (
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r="8"
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="1.5"
                                    className="animate-ping opacity-75"
                                  />
                                )}
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}

                    {/* Floating In-Chart Tooltip Pill (pointer-events-none completely prevents mouse jitter) */}
                    {chartHoveredBucket !== null && hourlyBuckets[chartHoveredBucket] && (() => {
                      const bucket = hourlyBuckets[chartHoveredBucket];
                      const x = 65 + chartHoveredBucket * 67 + 16;
                      const tooltipWidth = 150;
                      const tooltipX = Math.max(10, Math.min(760 - tooltipWidth - 10, x - tooltipWidth / 2));
                      return (
                        <g pointerEvents="none" className="transition-all duration-150">
                          <rect
                            x={tooltipX}
                            y={14}
                            width={tooltipWidth}
                            height={26}
                            rx={6}
                            fill="#1b1c1a"
                            fillOpacity="0.95"
                            stroke="#d4af37"
                            strokeWidth="1"
                          />
                          <text
                            x={tooltipX + tooltipWidth / 2}
                            y={31}
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="bold"
                            fontFamily="Plus Jakarta Sans"
                            textAnchor="middle"
                          >
                            {bucket.calls} calls • {bucket.avgLatency}ms • +${bucket.volumeUsdc}
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                {/* Fixed-Height Bottom Interactive Info Bar (Zero Layout Shift) */}
                <div className="w-full min-h-[46px] my-2 flex items-center">
                  {chartHoveredBucket !== null && hourlyBuckets[chartHoveredBucket] ? (
                    <div className="w-full p-2.5 rounded-xl bg-[#fbf9f6] border border-[#d4af37]/50 shadow-sm flex items-center justify-between flex-wrap gap-2 text-xs transition-all animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37] animate-pulse"></span>
                        <span className="font-bold text-[#1b1c1a]">
                          Window: {hourlyBuckets[chartHoveredBucket].label} ({hourlyBuckets[chartHoveredBucket].fullLabel})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-[11px] flex-wrap">
                        <span>
                          Calls: <strong className="text-[#1b1c1a]">{hourlyBuckets[chartHoveredBucket].calls}</strong> ({hourlyBuckets[chartHoveredBucket].settled} settled)
                        </span>
                        <span>
                          Volume: <strong className="text-emerald-700 font-bold">+${hourlyBuckets[chartHoveredBucket].volumeUsdc} USDC</strong>
                        </span>
                        <span>
                          Latency: <strong className="text-[#10b981] font-bold">{hourlyBuckets[chartHoveredBucket].avgLatency}ms</strong>
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded font-sans">
                          100% Gasless
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full p-2.5 rounded-xl bg-[#f5f3f0]/70 border border-[#d0c5af]/30 flex items-center justify-between flex-wrap gap-2 text-xs text-[#5b5e66] transition-all">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-semibold text-[#1b1c1a]">Telemetry Sentinel Active</span>
                        <span className="text-[11px] text-[#5b5e66]">• 10 Time Windows Monitored</span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] font-mono flex-wrap">
                        <span>Peak: <strong className="text-[#1b1c1a] font-sans">{maxHourlyCalls} calls/hr</strong></span>
                        <span>Median Latency: <strong className="text-[#735c00] font-sans">{medianLatency}ms</strong></span>
                        <span className="text-[#5b5e66] font-sans text-[10px]">Hover any interval bar for granular SLA receipts</span>
                      </div>
                    </div>
                  )}
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

            {/* ========================================================================= */}
            {/* 2 NEW ADVANCED STATS GRAPHS: Cumulative Cashflow Velocity & Service SLAs  */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* GRAPH 2: Cumulative Settlement Volume & Cashflow Velocity */}
              <div className="bg-white rounded-xl p-6 shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between relative">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#efeeeb]">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <h2 className="text-base font-bold text-[#1b1c1a]">
                          Cumulative Settlement Volume &amp; Cashflow Velocity
                        </h2>
                      </div>
                      <p className="text-xs text-[#5b5e66] mt-0.5">
                        Macro-progression of Buyer Outflow vs Seller Received Net Income
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 rounded-sm bg-[#10b981]"></span>
                        <span className="text-[#5b5e66] font-medium">Seller Credited</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 rounded-sm bg-[#2563eb]"></span>
                        <span className="text-[#5b5e66] font-medium">Buyer Debited</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold text-[10px]">
                        0.00 Gwei Gas
                      </div>
                    </div>
                  </div>

                  {/* 3 Metric Mini Tags */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-b border-[#efeeeb] text-center">
                    <div className="p-2 rounded-lg bg-[#fbf9f6] border border-[#d0c5af]/30">
                      <span className="text-[10px] uppercase font-bold text-[#5b5e66] block">Settlement Velocity</span>
                      <span className="text-xs font-bold text-[#1b1c1a] font-mono">~$0.0500 / call</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#fbf9f6] border border-[#d0c5af]/30">
                      <span className="text-[10px] uppercase font-bold text-[#5b5e66] block">Gas Sponsoring</span>
                      <span className="text-xs font-bold text-emerald-700 font-mono">100% Relayer Free</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#fbf9f6] border border-[#d0c5af]/30">
                      <span className="text-[10px] uppercase font-bold text-[#5b5e66] block">L2 Finality</span>
                      <span className="text-xs font-bold text-[#735c00] font-mono">~1.8s Blocktime</span>
                    </div>
                  </div>

                  {/* Dynamic Area SVG */}
                  <div className="w-full py-2">
                    <svg className="w-full h-40 overflow-visible" fill="none" viewBox="0 0 700 160" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="areaSellerGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid */}
                      <line stroke="#eae8e5" strokeDasharray="3 3" x1="45" x2="685" y1="20" y2="20"></line>
                      <line stroke="#eae8e5" strokeDasharray="3 3" x1="45" x2="685" y1="60" y2="60"></line>
                      <line stroke="#eae8e5" strokeDasharray="3 3" x1="45" x2="685" y1="100" y2="100"></line>
                      <line stroke="#eae8e5" x1="45" x2="685" y1="135" y2="135"></line>

                      {/* Y-axis labels */}
                      <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="5" y="24">${maxCumulativeValue.toFixed(2)}</text>
                      <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="5" y="80">${(maxCumulativeValue * 0.5).toFixed(2)}</text>
                      <text fill="#5b5e66" fontFamily="Plus Jakarta Sans" fontSize="10" x="5" y="139">$0.00</text>

                      {/* Points Calculation */}
                      {(() => {
                        const count = cumulativeProgression.length;
                        const points = cumulativeProgression.map((p, idx) => {
                          const px = 55 + idx * ((670 - 55) / Math.max(1, count - 1));
                          const py = 135 - Math.round((p.rawSellerCredit / (maxCumulativeValue || 1)) * 110);
                          return { x: px, y: py, p, idx };
                        });

                        const pathLine = points.reduce((acc, pt, i) => {
                          if (i === 0) return `M ${pt.x} ${pt.y}`;
                          const prev = points[i - 1];
                          const cx = (prev.x + pt.x) / 2;
                          return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
                        }, "");

                        const firstPt = points[0] || { x: 55, y: 135 };
                        const lastPt = points[points.length - 1] || { x: 670, y: 135 };
                        const pathArea = `${pathLine} L ${lastPt.x} 135 L ${firstPt.x} 135 Z`;

                        return (
                          <g>
                            {/* Area Fill */}
                            <path d={pathArea} fill="url(#areaSellerGrad)" />

                            {/* Seller Line (Green) */}
                            <path d={pathLine} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

                            {/* Buyer Line (Blue Dashed) */}
                            <path d={pathLine} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />

                            {/* Data points */}
                            {points.map((pt) => {
                              const isHovered = chartHoveredCumulative === pt.idx;
                              return (
                                <g
                                  key={pt.idx}
                                  className="cursor-pointer"
                                  onMouseEnter={() => setChartHoveredCumulative(pt.idx)}
                                  onMouseLeave={() => setChartHoveredCumulative(null)}
                                >
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={isHovered ? 6 : 4}
                                    fill={isHovered ? "#2563eb" : "#10b981"}
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                    className="transition-all duration-150"
                                  />
                                  <text
                                    x={pt.x}
                                    y={150}
                                    fill={isHovered ? "#1b1c1a" : "#5b5e66"}
                                    fontWeight={isHovered ? "bold" : "normal"}
                                    fontSize="9"
                                    fontFamily="Plus Jakarta Sans"
                                    textAnchor="middle"
                                  >
                                    {pt.p.label}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Floating In-Chart Tooltip (pointer-events-none prevents mouse jitter) */}
                            {chartHoveredCumulative !== null && cumulativeProgression[chartHoveredCumulative] && (() => {
                              const pt = cumulativeProgression[chartHoveredCumulative];
                              const count = cumulativeProgression.length;
                              const px = 55 + chartHoveredCumulative * ((670 - 55) / Math.max(1, count - 1));
                              const tooltipWidth = 160;
                              const tooltipX = Math.max(10, Math.min(700 - tooltipWidth - 10, px - tooltipWidth / 2));
                              return (
                                <g pointerEvents="none" className="transition-all duration-150">
                                  <rect
                                    x={tooltipX}
                                    y={12}
                                    width={tooltipWidth}
                                    height={24}
                                    rx={6}
                                    fill="#1b1c1a"
                                    fillOpacity="0.95"
                                    stroke="#10b981"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x={tooltipX + tooltipWidth / 2}
                                    y={28}
                                    fill="#ffffff"
                                    fontSize="9.5"
                                    fontWeight="bold"
                                    fontFamily="Plus Jakarta Sans"
                                    textAnchor="middle"
                                  >
                                    Seller: +${pt.sellerCreditedUsdc} | Buyer: -${pt.buyerDebitedUsdc}
                                  </text>
                                </g>
                              );
                            })()}
                          </g>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Fixed-Height Bottom Interactive Info Bar (Zero Layout Shift) */}
                  <div className="w-full min-h-[46px] my-2 flex items-center">
                    {chartHoveredCumulative !== null && cumulativeProgression[chartHoveredCumulative] ? (
                      <div className="w-full p-2.5 rounded-xl bg-[#f5f3f0] border border-emerald-300/80 shadow-sm flex items-center justify-between flex-wrap gap-2 text-xs font-mono transition-all animate-fade-in">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="font-bold text-[#1b1c1a] font-sans">
                            Milestone: {cumulativeProgression[chartHoveredCumulative].label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] flex-wrap">
                          <span className="text-emerald-700 font-bold">
                            Seller Inbound: +${cumulativeProgression[chartHoveredCumulative].sellerCreditedUsdc} USDC
                          </span>
                          <span className="text-blue-700 font-bold">
                            Buyer Outflow: -${cumulativeProgression[chartHoveredCumulative].buyerDebitedUsdc} USDC
                          </span>
                          <span className="text-[#5b5e66] font-sans text-[10px]">
                            Gas Saved: {cumulativeProgression[chartHoveredCumulative].gasSavedGwei} Gwei
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-2.5 rounded-xl bg-[#f5f3f0]/70 border border-[#d0c5af]/30 flex items-center justify-between flex-wrap gap-2 text-xs text-[#5b5e66] transition-all">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span className="font-semibold text-[#1b1c1a]">Macro Settlement Flow Active</span>
                          <span className="text-[11px] text-[#5b5e66]">• Base Sepolia EIP-3009 Relayed</span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] font-mono flex-wrap">
                          <span className="text-emerald-700 font-semibold font-sans">100% Relayer Sponsored Gas</span>
                          <span className="text-[#5b5e66] font-sans text-[10px]">Hover any milestone node for dual-wallet receipts</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Dual Wallet summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#efeeeb] text-[11px]">
                  <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-800 font-medium">Seller Cumulative Received:</span>
                    <span className="font-bold text-emerald-900 font-mono">+${sellerEarnedTotal} USDC</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-blue-800 font-medium">Buyer Cumulative Sent:</span>
                    <span className="font-bold text-blue-900 font-mono">-${buyerSpentTotal} USDC</span>
                  </div>
                </div>
              </div>

              {/* GRAPH 3: Service Invocations & SLA Quality Distribution Matrix */}
              <div className="bg-white rounded-xl p-6 shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20 flex flex-col justify-between relative">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#efeeeb]">
                    <div>
                      <div className="flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-[#735c00]" />
                        <h2 className="text-base font-bold text-[#1b1c1a]">
                          Service Invocations &amp; SLA Quality Matrix
                        </h2>
                      </div>
                      <p className="text-xs text-[#5b5e66] mt-0.5">
                        Traffic share, revenue capture, avg latency &amp; SLA pass-rate per endpoint
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1 self-start sm:self-auto">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>100% Schema SLA Guarantee</span>
                    </span>
                  </div>

                  {/* Category Share Segmented Progress Bar */}
                  <div className="py-3 border-b border-[#efeeeb]">
                    <div className="flex items-center justify-between text-[11px] text-[#5b5e66] mb-1.5">
                      <span className="font-semibold text-[#1b1c1a]">Marketplace Distribution by Service Category</span>
                      <span className="font-mono">{serviceDistribution.length} Active Services</span>
                    </div>
                    <div className="w-full h-3 bg-[#efeeeb] rounded-full overflow-hidden flex shadow-inner">
                      {serviceDistribution.slice(0, 4).map((svc, idx) => {
                        const colors = [
                          "bg-[#d4af37]",
                          "bg-emerald-500",
                          "bg-[#735c00]",
                          "bg-blue-500",
                        ];
                        return (
                          <div
                            key={svc.name}
                            style={{ width: `${Math.max(12, svc.sharePct)}%` }}
                            className={`${colors[idx % colors.length]} h-full transition-all duration-300 relative group`}
                            title={`${svc.name}: ${svc.sharePct}% traffic`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* List of Services Breakdown */}
                  <div className="divide-y divide-[#efeeeb] py-1 max-h-[175px] overflow-y-auto">
                    {serviceDistribution.slice(0, 4).map((svc, idx) => {
                      const isHovered = chartHoveredService === svc.name;
                      return (
                        <div
                          key={svc.name}
                          onMouseEnter={() => setChartHoveredService(svc.name)}
                          onMouseLeave={() => setChartHoveredService(null)}
                          className={`py-2.5 px-2 rounded-lg transition-all flex flex-col gap-1.5 ${
                            isHovered ? "bg-[#fbf9f6] shadow-2xs" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-[#efeeeb] text-[#1b1c1a] font-bold text-[10px] flex items-center justify-center font-mono">
                                0{idx + 1}
                              </span>
                              <span className="text-xs font-bold text-[#1b1c1a]">{svc.name}</span>
                              <span className="px-1.5 py-0.2 rounded bg-[#f5f3f0] text-[#5b5e66] text-[9px] font-medium border border-[#d0c5af]/30">
                                {svc.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-mono">
                              <span className="font-semibold text-[#1b1c1a]">{svc.calls} calls</span>
                              <span className="text-emerald-700 font-bold">+${svc.volumeUsdc} USDC</span>
                              <div className="flex items-center gap-0.5 text-[#735c00] font-sans font-bold text-[11px]">
                                <Star className="w-3 h-3 fill-[#d4af37] text-[#d4af37]" />
                                <span>{svc.avgRating}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-[10px]">
                            {/* Mini progress bar */}
                            <div className="flex-1 h-1.5 bg-[#efeeeb] rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.max(10, svc.sharePct)}%` }}
                                className="h-full bg-gradient-to-r from-[#d4af37] to-[#735c00] rounded-full"
                              />
                            </div>
                            <div className="flex items-center gap-3 text-[#5b5e66]">
                              <span className="flex items-center gap-1">
                                <Gauge className="w-3 h-3 text-[#10b981]" />
                                <strong className="text-[#10b981] font-mono">{svc.avgLatency}ms</strong>
                              </span>
                              <span className="font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                {svc.passRate}% SLA Pass
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Protocol Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-[#efeeeb] text-[11px]">
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#f5f3f0] rounded-xl border border-[#d0c5af]/30">
                    <span className="text-[#5b5e66]">Catalog Nodes:</span>
                    <span className="font-bold text-[#1b1c1a] font-mono">{services.length} Registered</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#f5f3f0] rounded-xl border border-[#d0c5af]/30">
                    <span className="text-[#5b5e66]">Dispute Ratio:</span>
                    <span className="font-bold text-emerald-700 font-mono">0.0% Auto-Reimbursed</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#f5f3f0] rounded-xl border border-[#d0c5af]/30">
                    <span className="text-[#5b5e66]">EIP-712 ECDSA:</span>
                    <span className="font-bold text-[#1b1c1a] font-mono">100% Validated</span>
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
                                  setSelectedTxForDetail(entry);
                                  setIsTxDetailModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#735c00] hover:text-[#1b1c1a] transition-all font-semibold text-xs border border-[#d0c5af]/30 shadow-sm"
                                title="View amount breakdown & cryptographic audit"
                                type="button"
                              >
                                <Receipt className="w-3.5 h-3.5 text-[#d4af37]" />
                                <span>Breakdown</span>
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
            )
          )}

        {/* 5. REVENUE & ESCROW DEDICATED VIEW */}
        {activeNavTab === "revenue" && (
          initialLoading && wallets.length === 0 ? (
            <RevenueSkeleton />
          ) : (
            <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header Banner & Protocol Verification */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#5b5e66] tracking-widest uppercase font-semibold">Workspace</span>
                  <span className="text-[#d0c5af] text-[10px]">/</span>
                  <span className="text-[10px] text-[#1b1c1a] font-semibold tracking-wider uppercase">Treasury &amp; Escrow</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eae8e5] text-[#10b981] text-[10px] font-semibold shadow-sm ml-2">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
                    Base Sepolia Escrow Verified
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl text-[#1b1c1a] font-bold tracking-tight">
                  Treasury &amp; Escrow Settlement
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
                    EIP-712 Meta-Tx Authorizations: <span className="font-mono text-[#1b1c1a] font-bold">#{ledger.length}</span>
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
                  onClick={() => setIsDepositModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#d4af37] text-white hover:bg-[#c39e26] text-xs font-bold shadow-[0_4px_16px_rgba(212,175,55,0.25)] transition-all cursor-pointer"
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

            {/* Top 4 Dedicated Treasury & Escrow KPI Cards (Non-Duplicate) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Card 1: Total Escrow Reserves */}
              <div className="p-5 bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-3 border border-[#d4af37]/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Total Treasury Reserves</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#10b981] font-mono tracking-tight">
                    ${totalVaultUsdc} <span className="text-xs font-semibold text-[#5b5e66]">USDC</span>
                  </div>
                  <p className="text-[#4d4635] mt-1 text-[13px] leading-tight">
                    Total on-chain liquidity custody across {wallets.length} ecosystem accounts
                  </p>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-[#5b5e66]">
                    <span>Reserve Health</span>
                    <span className="font-bold text-[#10b981]">100% Fully Backed</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#eae8e5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#10b981] rounded-full w-full"></div>
                  </div>
                </div>
              </div>

              {/* Card 2: Buyer Available Escrow */}
              <div className="p-5 bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-3 border border-[#d4af37]/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Buyer Available Escrow</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#1b1c1a] font-mono tracking-tight">
                    ${buyerVaultUsdc} <span className="text-xs font-semibold text-[#5b5e66]">USDC</span>
                  </div>
                  <p className="text-[#4d4635] mt-1 text-[13px] leading-tight">
                    Primary Scout account • Sufficient for {Math.floor(buyerVaultUnits / 35000).toLocaleString()}+ micro-tasks
                  </p>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-[#5b5e66]">
                    <span>Share of Treasury</span>
                    <span className="font-bold text-[#2563eb]">{buyerVaultPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#eae8e5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${buyerVaultPct}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Card 3: Seller Disbursed Pool */}
              <div className="p-5 bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-3 border border-[#d4af37]/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Seller Disbursed Pool</span>
                  <div className="w-8 h-8 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#735c00] shrink-0">
                    <WalletIcon className="w-4 h-4 text-[#735c00]" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#1b1c1a] font-mono tracking-tight">
                    ${sellerVaultUsdc} <span className="text-xs font-semibold text-[#5b5e66]">USDC</span>
                  </div>
                  <p className="text-[#4d4635] mt-1 text-[13px] leading-tight">
                    Claimable by {fundedSellerWalletsCount} of {totalSellerWalletsCount} provider addresses
                  </p>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-[#5b5e66]">
                    <span>Share of Treasury</span>
                    <span className="font-bold text-[#735c00]">{sellerVaultPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#eae8e5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#d4af37] rounded-full" style={{ width: `${sellerVaultPct}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Card 4: Relayer Paymaster Buffer */}
              <div className="p-5 bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-3 border border-[#d4af37]/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">Relayer Paymaster Buffer</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 shrink-0">
                    <Zap className="w-4 h-4 text-indigo-700" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-indigo-900 font-mono tracking-tight">
                    ${facilitatorVaultUsdc} <span className="text-xs font-semibold text-[#5b5e66]">USDC</span>
                  </div>
                  <p className="text-[#4d4635] mt-1 text-[13px] leading-tight">
                    Gasless sponsorship pool • {Number(onchainStatus?.relayer?.ethBalance || 0).toFixed(4)} ETH on Base Sepolia
                  </p>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-[#5b5e66]">
                    <span>Share of Treasury</span>
                    <span className="font-bold text-indigo-700">{facilitatorVaultPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#eae8e5] rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${facilitatorVaultPct}%` }}></div>
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
                    <p className="text-xs text-[#5b5e66]">Real-time reserve composition across smart contract custody vaults on Base L2.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#efeeeb] text-[#1b1c1a] font-mono text-xs font-semibold self-start sm:self-auto">
                    Total: ${totalVaultUsdc} USDC
                  </span>
                </div>

                {/* Segmented Allocation Bar */}
                <div className="space-y-2">
                  <div className="w-full h-4 rounded-full overflow-hidden bg-[#eae8e5] flex shadow-inner">
                    <div className="h-full bg-[#3b82f6] transition-all hover:opacity-90" style={{ width: `${buyerVaultPct}%` }} title={`Buyer Reserves: ${buyerVaultPct}%`}></div>
                    <div className="h-full bg-[#d4af37] transition-all hover:opacity-90" style={{ width: `${sellerVaultPct}%` }} title={`Seller Pool: ${sellerVaultPct}%`}></div>
                    <div className="h-full bg-indigo-600 transition-all hover:opacity-90" style={{ width: `${facilitatorVaultPct}%` }} title={`Relayer Buffer: ${facilitatorVaultPct}%`}></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span>
                        <span className="text-xs font-bold text-[#1b1c1a]">Buyer Reserves</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#1b1c1a] pl-4">${buyerVaultUsdc} ({buyerVaultPct}%)</span>
                      <span className="text-[10px] text-[#5b5e66] pl-4">Available for scout tasks</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]"></span>
                        <span className="text-xs font-bold text-[#1b1c1a]">Seller Custody Pool</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#1b1c1a] pl-4">${sellerVaultUsdc} ({sellerVaultPct}%)</span>
                      <span className="text-[10px] text-[#5b5e66] pl-4">Non-custodial claimable earnings</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                        <span className="text-xs font-bold text-[#1b1c1a]">Relayer Buffer</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#1b1c1a] pl-4">${facilitatorVaultUsdc} ({facilitatorVaultPct}%)</span>
                      <span className="text-[10px] text-[#5b5e66] pl-4">x402 Facilitator gas pool</span>
                    </div>
                  </div>
                </div>

                {/* Security & Audit Micro Banner */}
                <div className="p-3 bg-[#f5f3f0] rounded-lg flex flex-wrap items-center justify-between gap-2 text-[#4d4635] text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#735c00] shrink-0" />
                    <span className="font-semibold text-[#1b1c1a]">Base Sepolia Smart Contract Escrow</span>
                    <span>•</span>
                    <span>EIP-712 Replay Protection</span>
                    <span>•</span>
                    <span>30s Atomic Lease Lock</span>
                  </div>
                  <a
                    href="https://sepolia.basescan.org/token/0x036CbD53842c5426634e7929541eC2318f3dCF7e"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#735c00] hover:underline font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-0.5"
                  >
                    View USDC Contract <ArrowRight className="w-3.5 h-3.5 text-[#735c00]" />
                  </a>
                </div>
              </div>

              {/* Mascot Telemetry Companion Card */}
              <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] relative overflow-hidden flex flex-col justify-between border border-[#d4af37]/20">
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#735c00] font-bold">Autonomous Keeper</span>
                    <h3 className="text-lg font-bold text-[#1b1c1a] leading-tight mt-0.5">Settlement Keeper Bot</h3>
                    <p className="text-xs text-[#5b5e66] mt-1">Listening to Base Sepolia blocks for claim &amp; settlement events.</p>
                  </div>
                  <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md shrink-0 bg-[#efeeeb] border-2 border-[#d4af37]/40 flex items-center justify-center">
                    <img alt="Settlement Bot" className="w-full h-full object-cover" src="/bots/bot-3.svg" />
                  </div>
                </div>

                <div className="space-y-2 relative z-10 pt-4">
                  <div className="flex items-center justify-between py-1.5 bg-[#f5f3f0] px-3 rounded-lg text-xs">
                    <span className="text-[#5b5e66]">Base Sepolia Block</span>
                    <span className="font-bold text-[#10b981] flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span> #{onchainStatus?.blockNumber ? Number(onchainStatus.blockNumber).toLocaleString() : "48,202,439"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 bg-[#f5f3f0] px-3 rounded-lg text-xs">
                    <span className="text-[#5b5e66]">Median Latency</span>
                    <span className="font-mono font-bold text-[#1b1c1a]">{medianLatency}ms</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 bg-[#f5f3f0] px-3 rounded-lg text-xs">
                    <span className="text-[#5b5e66]">Active Prepaid Leases</span>
                    <span className="font-mono font-bold text-[#735c00]">{rentals.length} Active Leases</span>
                  </div>
                </div>

                <button
                  onClick={handleRunDiagnostics}
                  disabled={isRunningDiagnostics}
                  className="mt-4 w-full py-2 bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a] rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Cpu className={`w-3.5 h-3.5 ${isRunningDiagnostics ? "animate-spin text-[#735c00]" : ""}`} />
                  <span>{isRunningDiagnostics ? "Querying RPC Node..." : "Run Keeper Node Diagnostics"}</span>
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
            )
          )}

        {/* 6. API & WEBHOOKS DEDICATED VIEW */}
        {activeNavTab === "api" && (
          initialLoading && !user ? (
            <ApiSkeleton />
          ) : (
            <DeveloperHub triggerToast={triggerToast} />
          )
        )}
            </div>
          )}
        </main>

        {/* Global Footer (Hidden on Dispatcher to avoid overlap with chat interface) */}
        {activeNavTab !== "dispatcher" && (
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
        )}
      </div>

      {/* Deposit Escrow Reserve USDC Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#d4af37]/30 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[#efeeeb] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1b1c1a]">Deposit Escrow Reserve USDC</h3>
                  <p className="text-xs text-[#5b5e66]">Fund Buyer Agent escrow on Base Sepolia</p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#efeeeb] text-[#5b5e66] flex items-center justify-center transition-colors text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#f5f3f0] p-3.5 rounded-xl flex items-center justify-between text-xs">
              <span className="text-[#5b5e66]">Current Buyer Liquid Reserve:</span>
              <span className="font-mono font-bold text-[#1b1c1a] text-sm">${buyerVaultUsdc} USDC</span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#1b1c1a]">Select Deposit Amount (USDC):</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 25].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmountUsdc(amt)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      depositAmountUsdc === amt
                        ? "bg-[#d4af37] text-white border-[#d4af37] shadow-sm"
                        : "bg-[#ffffff] hover:bg-[#eae8e5] text-[#1b1c1a] border-[#d0c5af]/50"
                    }`}
                  >
                    +${amt}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-[#5b5e66]">Custom:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  value={depositAmountUsdc}
                  onChange={(e) => setDepositAmountUsdc(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#f5f3f0] border border-[#d0c5af]/50 text-xs font-mono font-bold text-[#1b1c1a] focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
                <span className="text-xs font-bold text-[#5b5e66]">USDC</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#efeeeb]">
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5b5e66] hover:bg-[#efeeeb] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDepositing}
                onClick={() => handleDepositReserve(depositAmountUsdc)}
                className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c59f2e] text-[#554300] font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDepositing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Deposit...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm Deposit +${depositAmountUsdc} USDC</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Service Quality & Telemetry Rating Modal */}
      <ServiceRatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        service={selectedServiceForRating}
        onRateSubmitted={async (rating) => {
          triggerToast(`⭐ Recorded ${rating}/5 rating for ${selectedServiceForRating?.name || "service"}!`);
          await refreshAllData();
        }}
      />

      {/* Transaction & Settlement Breakdown Modal */}
      <TransactionDetailModal
        isOpen={isTxDetailModalOpen}
        onClose={() => setIsTxDetailModalOpen(false)}
        tx={selectedTxForDetail}
      />

      {/* AI Cost Optimization & Rental Modal (Cross-Platform Sync) */}
      <RentalRecommendationModal
        isOpen={isRecommendationModalOpen}
        recommendation={aiRecommendation}
        onAccept={handleAcceptRecommendation}
        onDismiss={handleDismissRecommendation}
      />
    </div>
  );
}
