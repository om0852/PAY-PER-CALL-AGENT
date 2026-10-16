"use client";

import React from "react";
import Link from "next/link";
import {
  RefreshCw,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export interface TransactionItem {
  id: string;
  taskId: string;
  buyer: string;
  seller: string;
  serviceName: string;
  category: string;
  feeUsdc: string;
  latencyMs: number;
  txHash: string | null;
  status: string;
  createdAt: Date | string;
  protocol: string;
}

interface SettlementLedgerProps {
  transactions: TransactionItem[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onViewAll?: () => void;
}

export default function SettlementLedger({
  transactions,
  isRefreshing = false,
  onRefresh,
  onViewAll,
}: SettlementLedgerProps) {
  const formatTimeAgo = (dateStr: Date | string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const getBuyerInitials = (buyer: string) => {
    if (buyer.startsWith("0x")) {
      return buyer.slice(2, 4).toUpperCase();
    }
    return buyer.slice(0, 2).toUpperCase();
  };

  return (
    <section id="ledger-section" className="bg-white rounded-xl p-6 shadow-md flex flex-col gap-4 border border-[#d4af37]/15">
      {/* Ledger Header with Live Polling Indicator */}
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
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-[#735c00]" : "text-[#5b5e66]"}`} />
            <span>Auto-refreshing (3s)</span>
          </span>

          <button
            type="button"
            onClick={onRefresh}
            className="p-1 text-[#735c00] hover:text-[#554300] transition-colors rounded hover:bg-[#efeeeb]"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-Time Audit Trail Table */}
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
          <tbody className="divide-y divide-[#efeeeb]" id="settlement-ledger-body">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#5b5e66]">
                  No inbound transactions recorded yet. Waiting for buyer requests...
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#f5f3f0]/60 transition-colors">
                  {/* Time */}
                  <td className="py-3 px-4 font-mono text-[#5b5e66] text-[11px]">
                    {formatTimeAgo(tx.createdAt)}
                  </td>

                  {/* Buyer Agent */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#efeeeb] flex items-center justify-center font-bold text-[10px] text-[#1b1c1a]">
                        {getBuyerInitials(tx.buyer)}
                      </div>
                      <span className="font-bold text-[#1b1c1a]">
                        Scout Alpha
                      </span>
                      <span className="font-mono text-[#5b5e66] text-[10px]">
                        ({tx.buyer.slice(0, 6)}...{tx.buyer.slice(-3)})
                      </span>
                    </div>
                  </td>

                  {/* Service */}
                  <td className="py-3 px-4 font-semibold text-[#1b1c1a]">
                    {tx.serviceName}
                  </td>

                  {/* Fee Collected */}
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      +{tx.feeUsdc} USDC
                    </span>
                  </td>

                  {/* Latency */}
                  <td className="py-3 px-4 font-mono text-[#5b5e66] text-[11px]">
                    {tx.latencyMs}ms
                  </td>

                  {/* Tx Hash */}
                  <td className="py-3 px-4">
                    {tx.txHash ? (
                      <Link
                        href={`/tx/${tx.txHash}`}
                        className="font-mono text-[#735c00] hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>
                          {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="font-mono text-[#5b5e66] text-[10px]">Pending</span>
                    )}
                  </td>

                  {/* Settled Protocol */}
                  <td className="py-3 px-4">
                    <span className="text-[10px] bg-[#efeeeb] px-2 py-0.5 rounded text-[#4d4635] font-mono">
                      {tx.protocol || "EIP-3009 HTTP 402"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ledger Footer & Settlement Metrics */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-[#efeeeb] text-[#4d4635] text-[11px] gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span>Escrow Batch: #88219</span>
          <span>•</span>
          <span>Zero Failed Relays in 24h</span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            100% On-Chain Verifiable
          </span>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="text-[#735c00] hover:text-[#554300] hover:underline inline-flex items-center gap-1 font-semibold text-xs"
        >
          <span>View All {transactions.length} Transactions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}
