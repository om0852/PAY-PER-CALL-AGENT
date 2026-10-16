"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle,
  Bell,
  Activity,
  Layers,
  Zap,
  RefreshCw,
  Plus,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Search,
  Check,
} from "lucide-react";

export default function MobileAppCompanion() {
  const [activeTab, setActiveTab] = useState<"wallet" | "tx" | "services" | "agent" | "alerts">("wallet");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [topupModal, setTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState("5.00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchMobileData = async () => {
    try {
      const res = await fetch("/api/mobile/dashboard");
      if (res.ok) {
        const json = await res.json();
        setDashboardData(json.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMobileData();
    const interval = setInterval(fetchMobileData, 4000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeposit = async () => {
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/mobile/balance/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsdc: amt }),
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`Deposit of +$${amt.toFixed(2)} USDC confirmed on Base Sepolia!`);
        setTopupModal(false);
        fetchMobileData();
      } else {
        triggerToast(`Deposit failed: ${data.error}`);
      }
    } catch {
      triggerToast("Network error during deposit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLowBalance = dashboardData?.buyer?.isLowBalance ?? false;
  const alertsCount = dashboardData?.unreadAlertsCount ?? 0;

  return (
    <div className="min-h-screen bg-[#141513] text-[#1b1c1a] flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      {/* Top Banner Navigation back to desktop */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 text-white/80 text-xs">
        <Link href="/" className="flex items-center gap-1.5 hover:text-[#d4af37] transition-colors">
          <span>← Back to Full Workspace</span>
        </Link>
        <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>AgentBucket Mobile Companion</span>
        </div>
      </div>

      {/* Simulated Mobile Device Frame */}
      <div className="relative w-full max-w-[390px] h-[812px] bg-white rounded-[44px] shadow-[0_25px_70px_rgba(0,0,0,0.6)] border-[10px] border-[#262725] flex flex-col overflow-hidden relative">
        {/* Device Notch & Dynamic Island */}
        <div className="absolute top-0 left-0 right-0 h-7 bg-transparent z-50 flex items-center justify-center">
          <div className="w-32 h-5 bg-[#262725] rounded-b-2xl flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-black/60"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]/80"></span>
          </div>
        </div>

        {/* Mobile Header Bar */}
        <div className="pt-8 px-5 pb-3 bg-white border-b border-[#efeeeb] flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1b1c1a] text-[#d4af37] flex items-center justify-center font-bold text-xs shadow-xs">
              AB
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-[#1b1c1a] leading-none">AgentBucket</h1>
              <span className="text-[10px] text-[#5b5e66] font-mono">Base Sepolia L2</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("alerts")}
              className="relative w-8 h-8 rounded-full bg-[#f5f3f0] flex items-center justify-center text-[#1b1c1a]"
            >
              <Bell className="w-4 h-4" />
              {alertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center animate-bounce">
                  {alertsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#f8f7f4] pb-20">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-3 p-2.5 rounded-xl bg-[#1b1c1a] text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-fade-in border border-[#d4af37]">
              <CheckCircle className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* TAB 1: WALLET & BALANCES */}
          {activeTab === "wallet" && (
            <div className="space-y-3 animate-fade-in">
              {/* Low Balance Warning Banner */}
              {isLowBalance && (
                <div
                  onClick={() => setTopupModal(true)}
                  className="p-3 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-amber-900 block">Low Balance Alert</span>
                      <span className="text-[10px] text-amber-700">Buyer wallet is below $2.00 USDC. Tap to top up.</span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-amber-600 text-white text-[10px] font-bold shrink-0">
                    + Top Up
                  </span>
                </div>
              )}

              {/* Buyer Wallet Card */}
              <div className="p-4 rounded-2xl bg-white border border-[#d4af37] shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#5b5e66]">
                  <span>Buyer Agent Account</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono font-bold">
                    Payer (Debit)
                  </span>
                </div>
                <div className="my-2">
                  <span className="text-3xl font-extrabold text-[#1b1c1a] font-mono tracking-tight">
                    ${dashboardData?.buyer?.balanceUsdc || "10.0000"}
                  </span>
                  <span className="text-xs text-[#5b5e66] font-semibold ml-1">USDC</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#5b5e66] pt-2 border-t border-[#f4f4f2]">
                  <span className="font-mono">
                    {dashboardData?.buyer?.address
                      ? `${dashboardData.buyer.address.slice(0, 8)}...${dashboardData.buyer.address.slice(-6)}`
                      : "0xf39F...2266"}
                  </span>
                  <button
                    onClick={() => setTopupModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1b1c1a] text-white text-xs font-bold shadow-xs hover:bg-[#333]"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Top Up</span>
                  </button>
                </div>
              </div>

              {/* Seller Payout Card */}
              <div className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-sm">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#5b5e66]">
                  <span>Seller Earned Revenue</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold">
                    Beneficiary (Credit)
                  </span>
                </div>
                <div className="my-2">
                  <span className="text-3xl font-extrabold text-emerald-700 font-mono tracking-tight">
                    +${dashboardData?.seller?.balanceUsdc || "0.0000"}
                  </span>
                  <span className="text-xs text-[#5b5e66] font-semibold ml-1">USDC Settled</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#5b5e66] pt-2 border-t border-[#f4f4f2]">
                  <span className="font-mono">
                    {dashboardData?.seller?.address
                      ? `${dashboardData.seller.address.slice(0, 8)}...${dashboardData.seller.address.slice(-6)}`
                      : "0x7099...79C8"}
                  </span>
                  <span className="text-emerald-700 font-bold font-mono">
                    {dashboardData?.totalSettledCount || 0} Inbound Calls
                  </span>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setActiveTab("agent")}
                  className="p-3 rounded-xl bg-white border border-[#efeeeb] text-left hover:border-[#d4af37] transition-all"
                >
                  <Zap className="w-4 h-4 text-[#735c00] mb-1" />
                  <span className="text-xs font-bold text-[#1b1c1a] block">Run Automation</span>
                  <span className="text-[10px] text-[#5b5e66]">Launch 402 AI Agent</span>
                </button>
                <button
                  onClick={() => setActiveTab("services")}
                  className="p-3 rounded-xl bg-white border border-[#efeeeb] text-left hover:border-[#10b981] transition-all"
                >
                  <Activity className="w-4 h-4 text-[#10b981] mb-1" />
                  <span className="text-xs font-bold text-[#1b1c1a] block">Node Status</span>
                  <span className="text-[10px] text-[#5b5e66]">
                    {dashboardData?.servicesSummary?.healthy || 0} Healthy Nodes
                  </span>
                </button>
              </div>

              {/* Recent Settlements List */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#efeeeb]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#1b1c1a]">Recent Settlements</span>
                  <button onClick={() => setActiveTab("tx")} className="text-[11px] text-[#735c00] font-bold">
                    View All →
                  </button>
                </div>
                <div className="divide-y divide-[#f4f4f2]">
                  {dashboardData?.recentTransactions?.slice(0, 4).map((tx: any) => (
                    <div key={tx.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#1b1c1a] block">{tx.serviceName}</span>
                        <span className="text-[10px] text-[#8c8f94]">{tx.category} • {tx.time}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold block ${tx.status === "SETTLED" ? "text-emerald-700" : "text-rose-600"}`}>
                          {tx.status === "SETTLED" ? `+$${tx.amountUsdc}` : "$0.00"}
                        </span>
                        <span className="text-[9px] text-[#5b5e66]">{tx.latencyMs}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSACTIONS LEDGER */}
          {activeTab === "tx" && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1b1c1a]">Micro-Settlements Ledger</h2>
                <span className="text-[10px] font-mono text-[#5b5e66]">Base Sepolia L2</span>
              </div>
              <div className="space-y-2">
                {dashboardData?.recentTransactions?.map((tx: any) => (
                  <div key={tx.id} className="p-3 rounded-xl bg-white border border-[#efeeeb]">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#1b1c1a]">{tx.serviceName}</span>
                        <span className="text-[9px] block text-[#735c00] font-bold mt-0.5 uppercase">
                          {tx.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold text-xs ${tx.status === "SETTLED" ? "text-emerald-700" : "text-rose-600"}`}>
                          {tx.status === "SETTLED" ? `+$${tx.amountUsdc} USDC` : "$0.00 (Refunded)"}
                        </span>
                        <span className="text-[9px] text-[#8c8f94] block">{tx.time}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#f4f4f2] flex items-center justify-between text-[10px] text-[#5b5e66]">
                      <span className="text-emerald-700 font-mono font-semibold">⚡ {tx.latencyMs}ms</span>
                      <span className="bg-amber-100 text-[#735c00] font-bold px-1.5 py-0.2 rounded text-[9px]">
                        0.00 Gas Sponsored
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SERVICES STATUS */}
          {activeTab === "services" && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1b1c1a]">Service Nodes & Registry</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">
                  All Online
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Books Scraper Pro", category: "scraping", price: "0.0500", latency: 42, status: "HEALTHY" },
                  { name: "XML to JSON Pro Converter", category: "data", price: "0.0300", latency: 36, status: "HEALTHY" },
                  { name: "Sentiment & Category Classifier AI", category: "sentiment", price: "0.0350", latency: 68, status: "HEALTHY" },
                  { name: "Frankfurter FX Rates API", category: "fx-rates", price: "0.0250", latency: 48, status: "HEALTHY" },
                  { name: "Base L2 Oracle Node", category: "crypto-oracle", price: "0.0200", latency: 32, status: "HEALTHY" },
                  { name: "Compliance & AML Auditor", category: "compliance", price: "0.0400", latency: 54, status: "HEALTHY" },
                ].map((s) => (
                  <div key={s.name} className="p-3 rounded-xl bg-white border border-[#efeeeb]">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#1b1c1a]">{s.name}</span>
                        <span className="text-[9px] text-[#5b5e66] block font-mono">Category: {s.category}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                        Online
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#f4f4f2] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#10b981] font-semibold">⚡ {s.latency}ms</span>
                      <span className="font-bold text-[#1b1c1a]">${s.price} USDC</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AGENT AUTOMATION RUNNER */}
          {activeTab === "agent" && (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-sm font-bold text-[#1b1c1a]">Launch Autonomous Agent</h2>
              <div className="p-4 rounded-2xl bg-white border border-[#efeeeb] space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-[#5b5e66] uppercase block mb-1">
                    Task Prompt
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="Convert XML dataset to JSON, check travel book catalogue prices in INR, and analyze customer sentiment."
                    className="w-full p-2.5 rounded-xl border border-[#d0c5af] text-xs bg-[#fbf9f6] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#5b5e66] uppercase block mb-1">
                    Budget Cap: $0.50 USDC
                  </label>
                  <div className="flex gap-2">
                    {["$0.25", "$0.50", "$1.00"].map((b, i) => (
                      <span
                        key={b}
                        className={`flex-1 py-1.5 text-center rounded-lg text-xs font-bold cursor-pointer ${
                          i === 1 ? "bg-[#1b1c1a] text-white" : "bg-[#f5f3f0] text-[#5b5e66]"
                        }`}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => triggerToast("Launching autonomous agent pipeline via HTTP 402...")}
                  className="w-full py-3 rounded-xl bg-[#d4af37] text-[#1b1c1a] font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  <span>Execute Pay-Per-Call Pipeline</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ALERTS & NOTIFICATIONS */}
          {activeTab === "alerts" && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1b1c1a]">Active System Alerts</h2>
                <span className="text-[10px] text-[#5b5e66]">Auto-monitoring</span>
              </div>
              {dashboardData?.alerts && dashboardData.alerts.length > 0 ? (
                dashboardData.alerts.map((al: any) => (
                  <div
                    key={al.id}
                    className={`p-3 rounded-xl border text-xs ${
                      al.type === "LOW_BALANCE"
                        ? "bg-amber-50 border-amber-200"
                        : al.type === "FAILED_TASK"
                        ? "bg-orange-50 border-orange-200"
                        : "bg-rose-50 border-rose-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#1b1c1a]">{al.title}</span>
                      <span className="text-[9px] uppercase font-bold text-[#8c8f94]">{al.type}</span>
                    </div>
                    <p className="text-[11px] text-[#4b5563] leading-relaxed">{al.message}</p>
                    {al.type === "LOW_BALANCE" && (
                      <button
                        onClick={() => setTopupModal(true)}
                        className="mt-2 px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-[10px]"
                      >
                        + Top Up Now
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-[#efeeeb] text-center">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <span className="font-bold text-xs text-[#1b1c1a] block">All Systems Healthy</span>
                  <span className="text-[10px] text-[#5b5e66]">No low balance or down node alerts active.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Tab Bar Navigation */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-[#efeeeb] flex items-center justify-around px-2 z-20">
          {[
            { id: "wallet", label: "Wallet", icon: Wallet },
            { id: "tx", label: "Ledger", icon: ArrowUpRight },
            { id: "services", label: "Nodes", icon: Activity },
            { id: "agent", label: "Agents", icon: Zap },
            { id: "alerts", label: "Alerts", icon: Bell, badge: alertsCount },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center relative py-1 px-3 transition-colors ${
                  isActive ? "text-[#1b1c1a]" : "text-[#8c8f94]"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#1b1c1a]" : "text-[#8c8f94]"}`} />
                <span className={`text-[9px] mt-1 ${isActive ? "font-bold text-[#1b1c1a]" : "font-medium"}`}>
                  {tab.label}
                </span>
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute top-0 right-2 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Top-up Modal in Phone Screen */}
        {topupModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="w-full bg-white rounded-2xl p-4 border border-[#d4af37] shadow-xl">
              <h3 className="text-base font-extrabold text-[#1b1c1a]">Top Up Buyer Wallet</h3>
              <p className="text-[11px] text-[#5b5e66] mt-0.5 mb-3">
                Deposit test USDC into your autonomous buyer agent account on Base Sepolia.
              </p>

              <div className="flex gap-2 mb-3">
                {["5.00", "10.00", "25.00", "50.00"].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTopupAmount(amt)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                      topupAmount === amt
                        ? "bg-[#1b1c1a] text-white border-[#1b1c1a]"
                        : "bg-[#f5f3f0] text-[#1b1c1a] border-[#e4e2df]"
                    }`}
                  >
                    +${amt}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#d4af37] text-base font-mono font-bold text-[#1b1c1a] bg-[#fbf9f6] focus:outline-none"
                  placeholder="Enter amount"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTopupModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#f5f3f0] text-xs font-semibold text-[#1b1c1a]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#d4af37] text-xs font-bold text-[#1b1c1a] shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Depositing..." : "Confirm Deposit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
