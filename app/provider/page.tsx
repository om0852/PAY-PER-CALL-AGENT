"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Award,
  Copy,
  Check,
  Download,
  DollarSign,
  Zap,
  ShieldCheck,
  Gauge,
  TrendingUp,
  Shield,
  FileSpreadsheet,
  Cpu,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

import ProviderSidebar from "@/components/provider/ProviderSidebar";
import ProviderHeader from "@/components/provider/ProviderHeader";
import MetricCard from "@/components/provider/MetricCard";
import ServicesTable, { ManagedServiceItem } from "@/components/provider/ServicesTable";
import SettlementLedger, { TransactionItem } from "@/components/provider/SettlementLedger";
import SchemaModal from "@/components/provider/SchemaModal";
import RegisterServiceModal from "@/components/provider/RegisterServiceModal";

export default function ProviderStudioPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeframe, setTimeframe] = useState<"24H" | "7D" | "30D" | "All Time">("All Time");

  // Analytics state
  const [metrics, setMetrics] = useState({
    totalRevenueUsdc: "0.4100",
    totalRevenueAtomic: 410000,
    totalInvocations: 14,
    settledCalls: 14,
    pendingCalls: 0,
    deliveryRate: 96,
    reputationScore: "4.9",
    medianLatency: 65,
    p99Latency: 112,
    schemaDisputes: 0,
  });

  const [services, setServices] = useState<ManagedServiceItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [sellerAddress, setSellerAddress] = useState("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
  const [sellerLabel, setSellerLabel] = useState("AuraNode Labs");
  const [escrowContract, setEscrowContract] = useState("0x845320c99a80b875631ea235bfcdde1297e6402c");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [selectedServiceForSchema, setSelectedServiceForSchema] = useState<ManagedServiceItem | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2800);
  }, []);

  // Fetch live seller data from MongoDB backend
  const fetchAnalytics = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/seller/analytics?seller=${sellerAddress}&timeframe=${encodeURIComponent(timeframe)}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();

      if (data.success) {
        setMetrics(data.metrics);
        setServices(data.services);
        setTransactions(data.recentTransactions);
        if (data.sellerLabel) setSellerLabel(data.sellerLabel);
        if (data.escrowContract) setEscrowContract(data.escrowContract);
      }
    } catch (err) {
      console.error("Failed to load seller analytics:", err);
    } finally {
      setIsLoading(false);
      if (showIndicator) setIsRefreshing(false);
    }
  }, [sellerAddress, timeframe]);

  // Initial load
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh polling every 4 seconds for live settlement updates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAnalytics(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchAnalytics]);

  // Ping a specific service endpoint
  const handlePing = async (svc: ManagedServiceItem) => {
    triggerToast(`Pinging ${svc.name}... Sending health challenge`);
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
        triggerToast(`Pinging ${svc.name}: HTTP 402 Payment Challenge OK (${latency}ms)`);
      } else if (res.ok) {
        triggerToast(`Pinging ${svc.name}: 200 OK (${latency}ms)`);
      } else if (res.status === 404) {
        triggerToast(`Pinging ${svc.name}: HTTP 404 Route Not Found`);
      } else {
        triggerToast(`Pinging ${svc.name}: Status ${res.status} (${latency}ms)`);
      }
    } catch (err: unknown) {
      triggerToast(`Pinging ${svc.name}: Connection failed (${err instanceof Error ? err.message : "Error"})`);
    }
  };

  // Delete Service
  const handleDeleteService = async (svc: ManagedServiceItem) => {
    if (!confirm(`Are you sure you want to delete service "${svc.name}"?`)) return;
    try {
      const res = await fetch(`/api/registry/services?id=${svc.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete service");
      triggerToast(`Service "${svc.name}" deleted.`);
      await fetchAnalytics(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      triggerToast(`Delete failed: ${msg}`);
    }
  };

  // Inspect Schema
  const handleInspectSchema = (svc: ManagedServiceItem) => {
    setSelectedServiceForSchema(svc);
    setIsSchemaModalOpen(true);
  };

  // Export CSV
  const handleExportCsv = () => {
    triggerToast("Generating on-chain cryptographic ledger CSV...");
    if (transactions.length === 0) {
      triggerToast("No ledger records available to export yet.");
      return;
    }

    const headers = ["Transaction ID", "Time", "Buyer", "Service", "Fee (USDC)", "Latency (ms)", "Status", "TxHash"];
    const rows = transactions.map((t) => [
      t.id,
      new Date(t.createdAt).toISOString(),
      t.buyer,
      `"${t.serviceName}"`,
      t.feeUsdc,
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
    triggerToast("CSV downloaded successfully!");
  };

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

      {/* Reusable Sidebar Navigation */}
      <ProviderSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        healthyCount={services.filter((s) => s.health.status === "HEALTHY").length}
        totalEndpoints={services.length}
      />

      {/* Main Content Area */}
      <div className="pl-64 flex flex-col min-h-screen">
        {/* Reusable Header */}
        <ProviderHeader
          sellerAddress={sellerAddress}
          sellerLabel={sellerLabel}
          onRegisterClick={() => setIsRegisterModalOpen(true)}
          onCopyToast={triggerToast}
        />

        {/* Dashboard Canvas Container */}
        <main className="flex-1 w-full pt-16 bg-[#fbf9f6]">
          <div className="w-full px-6 md:px-8 xl:px-12 py-8 flex flex-col gap-8 max-w-[1600px] mx-auto">
            {/* ================= 1. STUDIO BANNER & WELCOME BAR ================= */}
            <section
              id="overview"
              className="relative w-full bg-white rounded-xl p-6 md:p-8 shadow-sm overflow-hidden border border-[#d4af37]/20"
            >
              {/* Ambient Gilded Background Glow */}
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
                    {/* Seller Tier Badge */}
                    <div className="inline-flex items-center gap-1.5 bg-[#f5f3f0] px-3 py-1 rounded-md border border-[#d0c5af]/40">
                      <Award className="w-4 h-4 text-[#735c00]" />
                      <span className="text-xs font-semibold text-[#1b1c1a]">
                        Guild Architect
                      </span>
                      <span className="text-[10px] bg-[#d4af37]/20 text-[#554300] px-1.5 py-0.2 rounded font-bold">
                        Lvl 3
                      </span>
                    </div>

                    {/* Escrow Contract Link */}
                    <div className="inline-flex items-center gap-1.5 bg-[#f5f3f0] px-3 py-1 rounded-md font-mono text-xs border border-[#d0c5af]/40">
                      <span className="text-[#5b5e66]">Base Sepolia Escrow:</span>
                      <span className="text-[#1b1c1a] font-semibold">
                        {escrowContract.slice(0, 7)}...{escrowContract.slice(-4)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(escrowContract);
                          triggerToast("Escrow address copied to clipboard");
                        }}
                        className="hover:text-[#735c00] transition-colors flex items-center p-0.5"
                        type="button"
                        title="Copy Escrow Address"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Sentinel Voxel Bot & Controls */}
                <div className="flex flex-col sm:flex-row items-end lg:items-center gap-4 w-full lg:w-auto">
                  {/* Mascot Interactive Sentinel Assistant Card */}
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
                        Monitoring {services.length} live endpoints • Zero-gas relay active
                      </p>
                    </div>
                  </div>

                  {/* Timeframe & CSV Export Actions */}
                  <div className="flex flex-col gap-2 items-end w-full sm:w-auto">
                    <div className="flex items-center p-1 bg-[#efeeeb] rounded-lg text-xs font-semibold">
                      {(["24H", "7D", "30D", "All Time"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setTimeframe(t);
                            triggerToast(`Filtered metrics for timeframe: ${t}`);
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

            {/* ================= 2. TOP 4 KPI METRIC CARDS ================= */}
            <section id="analytics-section" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Card 1: Total Revenue */}
              <MetricCard
                title="Total Revenue"
                tooltip="Total USDC transferred to your payout wallet via EIP-3009 offline signed authorizations."
                icon={DollarSign}
                iconBgColor="bg-[#d4af37]/20"
                iconColor="text-[#735c00]"
                value={`$${metrics.totalRevenueUsdc}`}
                unit="USDC"
                trendText={`${metrics.settledCalls} settled`}
                trendPositive={true}
                subtext={`${metrics.totalRevenueAtomic.toLocaleString()} atomic units`}
              />

              {/* Card 2: Total Invocations */}
              <MetricCard
                title="Invocations"
                tooltip="Total HTTP 402 paid requests initiated and settled by autonomous buyer agents."
                icon={Zap}
                iconBgColor="bg-[#efeeeb]"
                iconColor="text-[#1b1c1a]"
                value={String(metrics.totalInvocations)}
                unit="calls"
                trendText={`${metrics.schemaDisputes} rejected`}
                trendPositive={metrics.schemaDisputes === 0}
                subtext={`${metrics.deliveryRate}% SLA delivery`}
              />

              {/* Card 3: Reputation & SLA */}
              <MetricCard
                title="Delivery & SLA"
                tooltip="Calculated from verified output deliveries against strict Ajv schemas vs rejected outputs."
                icon={ShieldCheck}
                iconBgColor="bg-emerald-50"
                iconColor="text-emerald-600"
                value={`${metrics.deliveryRate}%`}
                trendText={`⭐ ${metrics.reputationScore}/5`}
                trendPositive={Number(metrics.deliveryRate) >= 80}
                subtext={`${metrics.schemaDisputes} schema dispute${metrics.schemaDisputes === 1 ? "" : "s"} caught`}
              />

              {/* Card 4: Median Latency */}
              <MetricCard
                title="Median Latency"
                tooltip="Median response time across all completed inferences and data calls."
                icon={Gauge}
                iconBgColor="bg-[#efeeeb]"
                iconColor="text-[#5b5e66]"
                value={`${metrics.medianLatency}ms`}
                trendText="⚡ Fast L2"
                trendPositive={true}
                subtext={`p99: ${metrics.p99Latency}ms • Base Sepolia`}
              />
            </section>

            {/* ================= 3. MY REGISTERED SERVICES TABLE ================= */}
            <ServicesTable
              services={services}
              onPing={handlePing}
              onInspectSchema={handleInspectSchema}
              onViewLogs={(svc) => {
                triggerToast(`Viewing invocation logs for ${svc.name}`);
              }}
              onToggleActive={(id, cur) => {
                setServices((prev) =>
                  prev.map((s) => (s.id === id ? { ...s, active: !cur } : s))
                );
                triggerToast(`Endpoint status updated`);
              }}
              onDeleteService={handleDeleteService}
              onCopyToast={triggerToast}
            />

            {/* ================= 4. LIVE INBOUND REVENUE & MICRO-SETTLEMENT LEDGER ================= */}
            <SettlementLedger
              transactions={transactions}
              isRefreshing={isRefreshing}
              onRefresh={() => fetchAnalytics(true)}
              onViewAll={() => triggerToast("Showing all ledger transactions in current batch")}
            />

            {/* ================= 5. PROTOCOL INFO CARDS ================= */}
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
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#735c00] shadow-sm shrink-0">
                  <Cpu className="w-5 h-5" />
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

        {/* Global Provider Studio Footer */}
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
              <a href="#" className="hover:text-[#1b1c1a] transition-colors">
                Smart Contracts
              </a>
              <a href="#" className="hover:text-[#1b1c1a] transition-colors">
                Agent RPC Protocol
              </a>
              <a href="#" className="hover:text-[#1b1c1a] transition-colors">
                Terms &amp; SLAs
              </a>
              <a href="#" className="hover:text-[#1b1c1a] transition-colors">
                System Status
              </a>
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
        defaultPayTo={sellerAddress}
        onSuccess={(newSvc) => {
          triggerToast(`Service "${newSvc.name}" registered successfully!`);
          fetchAnalytics(true);
        }}
      />
    </div>
  );
}
