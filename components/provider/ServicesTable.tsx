"use client";

import React, { useState } from "react";
import {
  Search,
  Copy,
  Check,
  Globe,
  Brain,
  Layers,
  MessageSquare,
  TrendingUp,
  FileCode,
  FileText,
  AlertTriangle,
} from "lucide-react";

export interface ManagedServiceItem {
  id: string;
  name: string;
  category: string;
  endpoint: string;
  priceUsdc: string;
  priceAtomic: number;
  active: boolean;
  health: {
    status: "HEALTHY" | "DEGRADED" | "DOWN" | "SCHEMA_MISMATCH";
    latencyMs: number;
    lastChecked?: Date | string;
    message?: string;
  };
  callsCount: number;
  revenueUsdc: string;
  schema?: Record<string, unknown>;
}

interface ServicesTableProps {
  services: ManagedServiceItem[];
  onPing: (service: ManagedServiceItem) => void;
  onInspectSchema: (service: ManagedServiceItem) => void;
  onViewLogs?: (service: ManagedServiceItem) => void;
  onToggleActive?: (serviceId: string, currentStatus: boolean) => void;
  onCopyToast?: (msg: string) => void;
}

export default function ServicesTable({
  services,
  onPing,
  onInspectSchema,
  onViewLogs,
  onToggleActive,
  onCopyToast,
}: ServicesTableProps) {
  const [filterTab, setFilterTab] = useState<"all" | "active" | "degraded">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeServices = services.filter((s) => s.active !== false);
  const degradedServices = services.filter(
    (s) => s.health.status === "DEGRADED" || s.health.status === "SCHEMA_MISMATCH" || s.health.status === "DOWN"
  );

  const filteredServices = services.filter((svc) => {
    // Tab filter
    if (filterTab === "active" && !svc.active) return false;
    if (
      filterTab === "degraded" &&
      svc.health.status !== "DEGRADED" &&
      svc.health.status !== "SCHEMA_MISMATCH" &&
      svc.health.status !== "DOWN"
    ) {
      return false;
    }
    // Search query filter
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

  const handleCopyEndpoint = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    if (onCopyToast) onCopyToast("Endpoint URL copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="services-section" className="bg-white rounded-xl p-6 shadow-md flex flex-col gap-4 border border-[#d4af37]/15">
      {/* Matrix Header & Tab Filtering */}
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

        {/* Filter Tabs & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[#efeeeb] p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1 rounded transition-all ${
                filterTab === "all"
                  ? "bg-white font-bold text-[#1b1c1a] shadow-sm"
                  : "text-[#5b5e66] hover:text-[#1b1c1a]"
              }`}
            >
              All ({services.length})
            </button>
            <button
              onClick={() => setFilterTab("active")}
              className={`px-3 py-1 rounded transition-all ${
                filterTab === "active"
                  ? "bg-white font-bold text-[#1b1c1a] shadow-sm"
                  : "text-[#5b5e66] hover:text-[#1b1c1a]"
              }`}
            >
              Active ({activeServices.length})
            </button>
            <button
              onClick={() => setFilterTab("degraded")}
              className={`px-3 py-1 rounded transition-all ${
                filterTab === "degraded"
                  ? "bg-white font-bold text-[#1b1c1a] shadow-sm"
                  : "text-[#5b5e66] hover:text-[#1b1c1a]"
              }`}
            >
              Degraded ({degradedServices.length})
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
            {filteredServices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#5b5e66]">
                  No services match the current filter or search criteria.
                </td>
              </tr>
            ) : (
              filteredServices.map((svc) => {
                const isDegraded =
                  svc.health.status === "SCHEMA_MISMATCH" ||
                  svc.health.status === "DEGRADED" ||
                  svc.health.status === "DOWN";

                return (
                  <tr
                    key={svc.id}
                    className={`hover:bg-[#f5f3f0]/70 transition-colors group ${
                      isDegraded ? "bg-rose-50/20" : ""
                    }`}
                  >
                    {/* Service & Category */}
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
                            {svc.health.message || `Proxy for ${svc.name}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Endpoint Proxy */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="bg-[#f5f3f0] px-2 py-1 rounded text-[#1b1c1a] truncate max-w-[170px] border border-[#d0c5af]/30">
                          {svc.endpoint.replace("http://localhost:3000", "") || svc.endpoint}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyEndpoint(svc.id, svc.endpoint)}
                          className="text-[#5b5e66] hover:text-[#735c00] transition-colors p-1"
                          title="Copy full endpoint URL"
                        >
                          {copiedId === svc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Price / Call */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] bg-[#d4af37]/20 text-[#554300] px-2 py-0.5 rounded-full font-bold">
                        {svc.priceUsdc} USDC
                      </span>
                    </td>

                    {/* Automated Health */}
                    <td className="py-3.5 px-4">
                      <div className="relative group/h flex items-center gap-1.5 cursor-pointer">
                        {svc.health.status === "HEALTHY" ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="font-bold text-emerald-700">
                              HEALTHY ({svc.health.latencyMs}ms)
                            </span>
                          </>
                        ) : svc.health.status === "SCHEMA_MISMATCH" ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <span className="font-bold text-amber-700">
                              ⚠️ SCHEMA_MISMATCH
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span className="font-bold text-rose-700">
                              {svc.health.status}
                            </span>
                          </>
                        )}
                        <div className="absolute left-0 bottom-full mb-1 w-52 p-2 bg-[#30312f] text-[#f2f0ed] text-[10px] rounded-lg shadow-md opacity-0 group-hover/h:opacity-100 transition-opacity pointer-events-none z-30 leading-snug">
                          {svc.health.message || "Active and verifying HTTP 402 micro-transactions"}
                        </div>
                      </div>
                    </td>

                    {/* Served */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#1b1c1a]">
                      {svc.callsCount} calls
                    </td>

                    {/* Revenue */}
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                      +${svc.revenueUsdc} USDC
                    </td>

                    {/* Active Status Toggle */}
                    <td className="py-3.5 px-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={svc.active}
                          onChange={() => onToggleActive && onToggleActive(svc.id, svc.active)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#eae8e5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#d4af37]"></div>
                      </label>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPing(svc)}
                          className="px-2.5 py-1 rounded bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a] text-[11px] font-semibold transition-all shadow-sm"
                        >
                          Ping
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectSchema(svc)}
                          className="p-1 hover:text-[#735c00] text-[#5b5e66] transition-colors"
                          title="Inspect JSON Schema"
                        >
                          <FileCode className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewLogs && onViewLogs(svc)}
                          className="p-1 hover:text-[#735c00] text-[#5b5e66] transition-colors"
                          title="View Invocation Logs"
                        >
                          <FileText className="w-4 h-4" />
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
    </section>
  );
}
