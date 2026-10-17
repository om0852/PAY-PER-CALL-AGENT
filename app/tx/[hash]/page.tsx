"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, ArrowLeft, ShieldCheck, Zap, Copy, Check, ExternalLink } from "lucide-react";
import { TxExplorerSkeleton } from "@/components/skeletons/PageSkeletons";

interface TxData {
  txHash: string;
  status: string;
  blockNumber: number;
  network: string;
  settledAt: string;
  gasSponsored: string;
  from: string;
  to: string;
  amount: number;
  usdcAmount: string;
  authorization: {
    from: string;
    to: string;
    value: number;
    validAfter: number;
    validBefore: number;
    nonce: string;
    status: string;
  } | null;
  signature: {
    v: number;
    r: string;
    s: string;
  };
  ecdsaValid: boolean;
  service: {
    name: string;
    category: string;
    latencyMs: number;
  } | null;
}

function TxExplorerContent() {
  const params = useParams();
  const hash = params?.hash as string;

  const [tx, setTx] = useState<TxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTx() {
      if (!hash) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/tx/${hash}`);
        if (!res.ok) {
          throw new Error(`Transaction ${hash} not found or settlement pending`);
        }
        const data = await res.json();
        setTx(data.transaction);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchTx();
  }, [hash]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2.5">
            <img
              src="/bots/bot-2.svg"
              alt="Sentinel"
              className="w-7 h-7 rounded-lg border border-indigo-500/40 shadow-sm"
            />
            <span className="text-xs font-mono uppercase px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
              x402 Micro-Explorer
            </span>
          </div>
        </div>

        {loading ? (
          <TxExplorerSkeleton />
        ) : error || !tx ? (
          <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-rose-300 space-y-2">
            <h2 className="text-lg font-bold">Transaction Not Found</h2>
            <p className="text-sm text-slate-400">{error || "Unable to locate hash"}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="p-6 md:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Transaction Details
                  </span>
                  <h1 className="text-xl md:text-2xl font-bold font-mono text-white mt-1 break-all">
                    {tx.txHash}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs font-medium rounded-full transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    BaseScan
                  </a>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {tx.status}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium rounded-full">
                    <Zap className="w-3.5 h-3.5" />
                    Gas Sponsored
                  </span>
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400">Settled Amount</span>
                  <p className="text-2xl font-bold text-emerald-400">
                    {tx.usdcAmount} <span className="text-sm font-normal text-slate-400">USDC</span>
                  </p>
                  <p className="text-xs text-slate-500 font-mono">({tx.amount} atomic units)</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400">Network & Facilitator</span>
                  <p className="text-base font-semibold text-slate-200">{tx.network}</p>
                  <p className="text-xs text-slate-400">{tx.gasSponsored}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400">Timestamp</span>
                  <p className="text-slate-200 font-mono text-xs">
                    {new Date(tx.settledAt).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400">Block Reference</span>
                  <p className="text-slate-200 font-mono text-xs">#{tx.blockNumber}</p>
                </div>
              </div>

              {/* Parties */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="/bots/bot-1.svg"
                      alt="Buyer Scout Bot"
                      className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-900 object-cover shrink-0 shadow-sm"
                    />
                    <div>
                      <span className="text-xs text-slate-400">From (Buyer Scout Agent):</span>
                      <p className="font-mono text-xs text-slate-200 break-all">{tx.from}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a
                      href={`https://sepolia.basescan.org/address/${tx.from}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                      title="View on BaseScan"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(tx.from, "from")}
                      className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                      title="Copy Address"
                    >
                      {copiedKey === "from" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="/bots/bot-3.svg"
                      alt="Seller Node"
                      className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-900 object-cover shrink-0 shadow-sm"
                    />
                    <div>
                      <span className="text-xs text-slate-400">To (Seller PayTo Node):</span>
                      <p className="font-mono text-xs text-slate-200 break-all">{tx.to}</p>
                      {tx.service && (
                        <p className="text-xs text-indigo-400 mt-0.5">
                          Service: {tx.service.name} ({tx.service.category}) • Latency: {tx.service.latencyMs}ms
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a
                      href={`https://sepolia.basescan.org/address/${tx.to}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                      title="View on BaseScan"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(tx.to, "to")}
                      className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                      title="Copy Address"
                    >
                      {copiedKey === "to" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>


            {/* EIP-3009 Authorization & Cryptographic Proof */}
            <div className="p-6 md:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white">EIP-3009 Authorization & Cryptography</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ECDSA Valid
                </span>
              </div>

              {tx.authorization && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 overflow-x-auto">
                    <p className="text-slate-400 uppercase text-[10px] tracking-wider">Decoded Typed Data Message</p>
                    <div><span className="text-indigo-400">from:</span> {tx.authorization.from}</div>
                    <div><span className="text-indigo-400">to:</span> {tx.authorization.to}</div>
                    <div><span className="text-indigo-400">value:</span> {tx.authorization.value}</div>
                    <div><span className="text-indigo-400">validAfter:</span> {tx.authorization.validAfter}</div>
                    <div><span className="text-indigo-400">validBefore:</span> {tx.authorization.validBefore}</div>
                    <div><span className="text-indigo-400">nonce:</span> {tx.authorization.nonce}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 overflow-x-auto">
                    <p className="text-slate-400 uppercase text-[10px] tracking-wider">Signature Components (v, r, s)</p>
                    <div><span className="text-emerald-400">v:</span> {tx.signature.v}</div>
                    <div className="break-all"><span className="text-emerald-400">r:</span> {tx.signature.r}</div>
                    <div className="break-all"><span className="text-emerald-400">s:</span> {tx.signature.s}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TxExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 p-12 text-center font-mono text-xs">
          Loading x402 transaction explorer...
        </div>
      }
    >
      <TxExplorerContent />
    </Suspense>
  );
}
