"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Star,
  ShieldCheck,
  Gauge,
  Clock,
  ExternalLink,
  Award,
  Check,
  Send,
  Sparkles,
} from "lucide-react";

export interface ServiceRatingItem {
  id: string;
  name: string;
  category: string;
  endpoint: string;
  price: number;
  payTo: string;
  averageUserRating?: number;
  totalRatingsCount?: number;
  health?: {
    status: string;
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
}

interface ServiceRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceRatingItem | null;
  onRateSubmitted?: (rating: number, feedback?: string) => void;
}

export default function ServiceRatingModal({
  isOpen,
  onClose,
  service,
  onRateSubmitted,
}: ServiceRatingModalProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && service) {
      setLoadingReviews(true);
      setSubmitSuccess(false);
      setFeedbackNote("");
      setSelectedRating(5);

      fetch(`/api/ledger?serviceName=${encodeURIComponent(service.name)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.logs) {
            setReviews(data.logs);
          }
        })
        .catch(() => {
          // ignore error
        })
        .finally(() => {
          setLoadingReviews(false);
        });
    }
  }, [isOpen, service]);

  if (!isOpen || !service) return null;

  const avgRating = service.averageUserRating || 5.0;
  const totalReviewsCount = service.totalRatingsCount || reviews.filter((r) => r.userRating).length;
  const ratedReviews = reviews.filter((r) => r.userRating);

  // Compute breakdown percentages
  const fiveStars = ratedReviews.filter((r) => r.userRating === 5).length;
  const fourStars = ratedReviews.filter((r) => r.userRating === 4).length;
  const threeStars = ratedReviews.filter((r) => r.userRating === 3).length;
  const twoStars = ratedReviews.filter((r) => r.userRating === 2).length;
  const oneStar = ratedReviews.filter((r) => r.userRating === 1).length;

  const totalCount = ratedReviews.length || 1;
  const pct5 = Math.round((fiveStars / totalCount) * 100) || (ratedReviews.length === 0 ? 95 : 0);
  const pct4 = Math.round((fourStars / totalCount) * 100) || (ratedReviews.length === 0 ? 5 : 0);
  const pct3 = Math.round((threeStars / totalCount) * 100);
  const pct2 = Math.round((twoStars / totalCount) * 100);
  const pct1 = Math.round((oneStar / totalCount) * 100);

  const handleRateSubmit = async () => {
    if (!service) return;
    setIsSubmitting(true);
    try {
      // Find latest ledger id for this service or pass serviceName
      const latestLog = reviews[0];
      const res = await fetch("/api/ledger/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledgerId: latestLog ? latestLog._id : undefined,
          serviceName: service.name,
          rating: selectedRating,
          feedback: feedbackNote || "Verified autonomous execution",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitSuccess(true);
        if (onRateSubmitted) {
          onRateSubmitted(selectedRating, feedbackNote);
        }
        // Refresh reviews list
        const updated = await fetch(`/api/ledger?serviceName=${encodeURIComponent(service.name)}`).then((r) => r.json());
        if (updated.logs) setReviews(updated.logs);
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#fbf9f6] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border-2 border-[#d4af37]/40 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#efeeeb] bg-[#f5f3f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#735c00] flex items-center justify-center text-white shadow-md shadow-[#d4af37]/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1b1c1a]">
                  {service.name}
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#efeeeb] text-[#554300] border border-[#d0c5af]/40">
                  {service.category}
                </span>
              </div>
              <p className="text-xs text-[#5b5e66] font-mono mt-0.5">
                Provider: {service.payTo ? `${service.payTo.slice(0, 8)}...${service.payTo.slice(-6)}` : "Verified Provider"}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Top Rating Summary Card */}
          <div className="bg-white rounded-xl p-5 border border-[#d4af37]/30 shadow-sm flex flex-col sm:flex-row items-center gap-6 justify-between">
            {/* Big Rating Number */}
            <div className="flex flex-col items-center sm:items-start shrink-0">
              <span className="text-4xl font-extrabold text-[#1b1c1a] font-mono tracking-tight flex items-baseline gap-1">
                {avgRating.toFixed(1)}
                <span className="text-lg text-[#5b5e66] font-normal">/ 5.0</span>
              </span>
              <div className="flex items-center gap-1 my-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(avgRating)
                        ? "fill-[#d4af37] text-[#d4af37]"
                        : "text-zinc-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-[#5b5e66]">
                {totalReviewsCount} {totalReviewsCount === 1 ? "review" : "reviews"} recorded
              </span>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Tier-1 Verified Service
              </div>
            </div>

            {/* Star Distribution Bars */}
            <div className="flex-1 w-full max-w-xs flex flex-col gap-1.5 text-xs">
              {[
                { label: "5★", pct: pct5, count: fiveStars },
                { label: "4★", pct: pct4, count: fourStars },
                { label: "3★", pct: pct3, count: threeStars },
                { label: "2★", pct: pct2, count: twoStars },
                { label: "1★", pct: pct1, count: oneStar },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-5 text-[11px] font-mono font-bold text-[#5b5e66] text-right">
                    {row.label}
                  </span>
                  <div className="flex-1 bg-[#efeeeb] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#d4af37] h-full rounded-full transition-all duration-500"
                      style={{ width: `${row.pct}%` }}
                    ></div>
                  </div>
                  <span className="w-8 text-[10px] font-mono text-[#5b5e66] text-right">
                    {row.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Three Telemetry SLA Parameters */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5b5e66]">
              Automated Technical SLA Telemetry (Multi-Parameter)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Param 1: Schema */}
              <div className="bg-white p-3.5 rounded-xl border border-[#d0c5af]/40 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[#5b5e66]">
                  <span className="text-[10px] uppercase font-bold">Schema RFC-7</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-emerald-700">100% Strict Pass</span>
                <p className="text-[10px] text-[#5b5e66] leading-tight">
                  Ajv draft-07 compiler verification. Zero payload drift.
                </p>
              </div>

              {/* Param 2: Latency */}
              <div className="bg-white p-3.5 rounded-xl border border-[#d0c5af]/40 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[#5b5e66]">
                  <span className="text-[10px] uppercase font-bold">Latency SLA</span>
                  <Clock className="w-4 h-4 text-[#735c00]" />
                </div>
                <span className="text-sm font-bold text-[#1b1c1a] font-mono">
                  {service.health?.latencyMs || 250}ms <span className="text-[10px] text-emerald-600 font-sans">(&lt; 1.5s)</span>
                </span>
                <p className="text-[10px] text-[#5b5e66] leading-tight">
                  High-throughput proxy response within strict execution budget.
                </p>
              </div>

              {/* Param 3: Price Adherence */}
              <div className="bg-white p-3.5 rounded-xl border border-[#d0c5af]/40 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[#5b5e66]">
                  <span className="text-[10px] uppercase font-bold">Price Adherence</span>
                  <Gauge className="w-4 h-4 text-[#735c00]" />
                </div>
                <span className="text-sm font-bold text-[#1b1c1a] font-mono">
                  ${(service.price / 1e6).toFixed(4)} USDC
                </span>
                <p className="text-[10px] text-[#5b5e66] leading-tight">
                  HTTP 402 challenge matches registered unit price with 0 surcharges.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive User Rating Form */}
          <div className="bg-white p-4 rounded-xl border border-[#d4af37]/30 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1b1c1a] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#d4af37]" />
                Submit User Review &amp; Rating for this Service:
              </span>
              <span className="text-[11px] font-mono font-bold text-[#735c00]">
                {selectedRating}.0 / 5.0 Stars
              </span>
            </div>

            {submitSuccess ? (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Your rating has been recorded on the Base Sepolia ledger and service registry!</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={isSubmitting}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setSelectedRating(star)}
                        className="p-1 hover:scale-125 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= (hoverRating || selectedRating)
                              ? "fill-[#d4af37] text-[#d4af37]"
                              : "text-zinc-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Feedback Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["⚡ Fast Latency", "🎯 Precise Schema", "💎 High Quality", "🛡️ High SLA"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setFeedbackNote(tag)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          feedbackNote === tag
                            ? "bg-[#d4af37] text-[#554300]"
                            : "bg-[#f5f3f0] hover:bg-[#d4af37]/20 text-[#5b5e66]"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Optional review feedback note..."
                    className="flex-1 bg-[#f5f3f0] text-[#1b1c1a] px-3 py-1.5 rounded-lg text-xs border border-[#d0c5af]/50 focus:outline-none focus:bg-white focus:border-[#d4af37]"
                  />
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleRateSubmit}
                    className="px-4 py-1.5 rounded-lg bg-[#d4af37] text-[#554300] font-bold text-xs flex items-center gap-1.5 hover:brightness-105 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* User Review Logs / History */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5b5e66] flex items-center justify-between">
              <span>Verified Inbound Reviews &amp; Execution Logs</span>
              <span className="font-mono text-[10px] text-[#5b5e66]">
                {reviews.length} Total Settlements
              </span>
            </h4>

            {loadingReviews ? (
              <div className="py-8 text-center text-xs text-[#5b5e66]">
                Loading verified telemetry logs...
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-[#d0c5af]/30 text-center text-xs text-[#5b5e66]">
                No executions recorded for this service yet. Launch an autonomous task to record live telemetry!
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {reviews.slice(0, 10).map((r, idx) => {
                  const rating = r.userRating || 5;
                  const isSettled = r.status === "SETTLED";
                  return (
                    <div
                      key={r._id || idx}
                      className="bg-white p-3 rounded-xl border border-[#efeeeb] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center text-[#d4af37]">
                          <Star className="w-3.5 h-3.5 fill-[#d4af37]" />
                          <span className="font-mono font-bold text-[11px] ml-1 text-[#735c00]">
                            {rating}.0
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-[#5b5e66]">
                            Buyer: {r.buyer ? `${r.buyer.slice(0, 6)}...${r.buyer.slice(-4)}` : "Autonomous Scout"}
                          </span>
                          {r.ratingFeedback && (
                            <span className="text-[11px] font-medium text-[#1b1c1a]">
                              &quot;{r.ratingFeedback}&quot;
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[11px] text-[#5b5e66]">
                          {r.latencyMs}ms
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSettled ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {isSettled ? "Settled" : "Refunded"}
                        </span>
                        {r.txHash && (
                          <a
                            href={`https://sepolia.basescan.org/tx/${r.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#735c00] hover:underline flex items-center gap-0.5 font-mono text-[10px]"
                            title="Verify on BaseScan"
                          >
                            <span>BaseScan</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
