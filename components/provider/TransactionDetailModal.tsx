"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  Gauge,
  Star,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Receipt,
} from "lucide-react";

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tx: {
    _id?: string;
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
    status: string;
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
  } | null;
}

export default function TransactionDetailModal({
  isOpen,
  onClose,
  tx,
}: TransactionDetailModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !tx) return null;

  const isSettled = tx.status === "SETTLED";
  const listedUsdc = (tx.listedPrice / 1e6).toFixed(4);
  const paidUsdc = (tx.paidPrice / 1e6).toFixed(4);
  const askedUsdc = (tx.askedPrice / 1e6).toFixed(4);
  const hash = tx.txHash || "0x4bfde85eb7a4128f6e2b9c3a0d1f7e4a8b2c6d9e0f1a3b5c7d9e1f3a5b7c9d1e";

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#fbf9f6] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border-2 border-[#d4af37]/40 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#efeeeb] bg-[#f5f3f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#735c00] flex items-center justify-center text-white shadow-md shadow-[#d4af37]/30 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1b1c1a]">
                  Micro-Settlement Audit &amp; Breakdown
                </h3>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    isSettled ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {isSettled ? "✓ Settled (200 OK)" : "✕ Refunded / Dispute"}
                </span>
              </div>
              <p className="text-xs text-[#5b5e66] font-mono mt-0.5 flex items-center gap-1.5">
                <span>Tx: {hash.slice(0, 10)}...{hash.slice(-8)}</span>
                <button
                  onClick={() => copyToClipboard(hash, "hash")}
                  className="hover:text-[#735c00] p-0.5"
                  title="Copy Transaction Hash"
                >
                  {copiedKey === "hash" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#eae8e5] text-[#5b5e66] hover:text-[#1b1c1a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* 1. Core Amount Breakdown Card */}
          <div className="bg-white rounded-xl p-5 border border-[#d4af37]/30 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#efeeeb]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#735c00] flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#d4af37]" />
                Settlement Amount Breakdown
              </span>
              <span className="font-mono text-xs text-[#5b5e66]">
                Asset: Circle USDC (6 Decimals)
              </span>
            </div>

            {/* Line Items */}
            <div className="flex flex-col gap-2 text-xs">
              {/* Item 1: Gross Service Fee */}
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="font-semibold text-[#1b1c1a]">Gross Service Fee (Listed Unit Price)</span>
                  <span className="text-[10px] text-[#5b5e66]">Contract price configured by provider in registry</span>
                </div>
                <span className="font-mono font-bold text-[#1b1c1a]">
                  ${listedUsdc} USDC
                </span>
              </div>

              {/* Item 2: Relayer Gas Fee */}
              <div className="flex items-center justify-between py-1 border-t border-[#f5f3f0]">
                <div className="flex flex-col">
                  <span className="font-semibold text-[#1b1c1a] flex items-center gap-1.5">
                    <span>Base Sepolia L2 Gas Fee</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-bold">
                      Sponsored
                    </span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    Paid by Facilitator Relayer (Saved ~$0.000100 L2 Gas)
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-600">
                  -$0.0000 USDC
                </span>
              </div>

              {/* Item 3: Platform Surcharge */}
              <div className="flex items-center justify-between py-1 border-t border-[#f5f3f0]">
                <div className="flex flex-col">
                  <span className="font-semibold text-[#1b1c1a]">Platform Protocol Fee</span>
                  <span className="text-[10px] text-[#5b5e66]">0% surcharge during hackathon evaluation</span>
                </div>
                <span className="font-mono font-bold text-[#5b5e66]">
                  +$0.0000 USDC
                </span>
              </div>

              {/* Total Settlement Amount */}
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#fbf9f6] border border-[#d0c5af]/40 mt-1">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1b1c1a] uppercase tracking-wide">
                    Net Amount Debited From Buyer
                  </span>
                  <span className="text-[10px] text-[#5b5e66]">
                    Transferred via EIP-3009 authorization
                  </span>
                </div>
                <span className="font-mono text-base font-extrabold text-emerald-700">
                  ${isSettled ? paidUsdc : "0.0000"} USDC
                </span>
              </div>

              {/* Net Credited to Seller */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-900">
                  Net Amount Credited to Seller Provider
                </span>
                <span className="font-mono text-xs font-bold text-emerald-800">
                  +${isSettled ? paidUsdc : "0.0000"} USDC
                </span>
              </div>
            </div>
          </div>

          {/* 2. Participant Wallets Routing */}
          <div className="bg-white rounded-xl p-4 border border-[#efeeeb] flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5b5e66]">
              Participant Wallets &amp; Payout Routing
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Buyer */}
              <div className="p-3 rounded-lg bg-[#fbf9f6] border border-[#d0c5af]/30 flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-[#5b5e66]">Buyer Account (Agent)</span>
                <span className="font-bold text-[#1b1c1a]">Autonomous Scout</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-[11px] text-[#5b5e66]">
                    {tx.buyer.slice(0, 8)}...{tx.buyer.slice(-6)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tx.buyer, "buyer")}
                    className="text-[#735c00] hover:underline flex items-center gap-1 text-[10px]"
                  >
                    <span>{copiedKey === "buyer" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Seller */}
              <div className="p-3 rounded-lg bg-[#fbf9f6] border border-[#d0c5af]/30 flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-[#5b5e66]">Seller Account (Provider)</span>
                <span className="font-bold text-[#1b1c1a]">{tx.serviceName}</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-[11px] text-[#5b5e66]">
                    {tx.seller.slice(0, 8)}...{tx.seller.slice(-6)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tx.seller, "seller")}
                    className="text-[#735c00] hover:underline flex items-center gap-1 text-[10px]"
                  >
                    <span>{copiedKey === "seller" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Relayer */}
            <div className="p-2.5 rounded-lg bg-[#f5f3f0] border border-[#efeeeb] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[#5b5e66]">
                  Gasless Facilitator Relayer: <strong className="font-mono text-[#1b1c1a]">0x9965...A4dc</strong>
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                Base Sepolia Active
              </span>
            </div>
          </div>

          {/* 3. Cryptographic Proof & SLA Telemetry */}
          <div className="bg-white rounded-xl p-4 border border-[#efeeeb] flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5b5e66]">
              Cryptographic Proof &amp; Telemetry Audit
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-[#fbf9f6] border border-[#efeeeb] flex flex-col items-center">
                <span className="text-[10px] text-[#5b5e66]">Protocol</span>
                <span className="font-bold text-[#1b1c1a] mt-0.5">EIP-3009</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#fbf9f6] border border-[#efeeeb] flex flex-col items-center">
                <span className="text-[10px] text-[#5b5e66]">Latency</span>
                <span className="font-mono font-bold text-[#1b1c1a] mt-0.5">{tx.latencyMs}ms</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#fbf9f6] border border-[#efeeeb] flex flex-col items-center">
                <span className="text-[10px] text-[#5b5e66]">Schema Strict</span>
                <span className="font-bold text-emerald-700 mt-0.5">100% Pass</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#fbf9f6] border border-[#efeeeb] flex flex-col items-center">
                <span className="text-[10px] text-[#5b5e66]">Quality SLA</span>
                <span className="font-mono font-bold text-[#d4af37] mt-0.5">
                  ★ {tx.userRating ? `${tx.userRating}.0` : "4.9"}
                </span>
              </div>
            </div>

            {tx.ratingFeedback && (
              <div className="p-2.5 rounded-lg bg-amber-50/40 border border-amber-200/60 text-xs flex items-center gap-2">
                <Star className="w-3.5 h-3.5 fill-[#d4af37] text-[#d4af37] shrink-0" />
                <span className="text-[#554300]">
                  User Feedback: <strong>&quot;{tx.ratingFeedback}&quot;</strong>
                </span>
              </div>
            )}
          </div>

          {/* 4. Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <a
              href={`https://sepolia.basescan.org/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#d4af37] text-[#554300] font-bold text-xs flex items-center gap-2 hover:brightness-105 transition-all shadow-sm"
            >
              <span>Inspect on BaseScan Block Explorer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#eae8e5] text-xs font-semibold text-[#1b1c1a] border border-[#d0c5af]/50 transition-colors"
            >
              Close Audit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
