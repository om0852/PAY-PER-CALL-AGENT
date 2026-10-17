"use client";

import React, { useState } from "react";
import {
  Sparkles,
  TrendingDown,
  Zap,
  ShieldCheck,
  CheckCircle,
  X,
  Clock,
  ArrowRight,
  Bot,
  DollarSign,
} from "lucide-react";

export interface AiRecommendationData {
  id: string;
  buyerAddress: string;
  serviceName: string;
  category: string;
  status: string;
  callCount: number;
  payPerCallPriceUsdc: number;
  rentalPriceUsdc: number;
  rentalQuota: number;
  projectedPayPerCallCost: number;
  netSavingsUsdc: number;
  savingsPercent: number;
  llmAnalysis: string;
  createdAt: string | Date;
}

interface RentalRecommendationModalProps {
  recommendation: AiRecommendationData | null;
  onAccept: (rec: AiRecommendationData) => Promise<void>;
  onDismiss: (rec: AiRecommendationData) => Promise<void>;
  isOpen: boolean;
}

export default function RentalRecommendationModal({
  recommendation,
  onAccept,
  onDismiss,
  isOpen,
}: RentalRecommendationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justRented, setJustRented] = useState(false);

  if (!isOpen || !recommendation) return null;

  const handleRent = async () => {
    setIsSubmitting(true);
    try {
      await onAccept(recommendation);
      setJustRented(true);
      setTimeout(() => {
        setJustRented(false);
      }, 2500);
    } catch (err) {
      console.error("Failed to accept rental recommendation:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    setIsSubmitting(true);
    try {
      await onDismiss(recommendation);
    } catch (err) {
      console.error("Failed to dismiss recommendation:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border-2 border-[#d4af37]/40 overflow-hidden flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#d4af37]/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-[#fcfbf9] via-white to-[#f8f6f0] border-b border-[#efeeeb] flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#d4af37] to-[#fee179] p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#1b1c1a] rounded-[10px] flex items-center justify-center">
                <Bot className="w-6 h-6 text-[#fee179] animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-extrabold tracking-wider bg-[#d4af37]/20 text-[#735c00] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#735c00]" />
                  AI Cost Optimization Advisor
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping"></span>
              </div>
              <h2 className="text-lg font-bold text-[#1b1c1a] leading-tight mt-1">
                High-Volume Invocations Detected
              </h2>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full hover:bg-[#efeeeb] text-[#5b5e66] flex items-center justify-center transition-colors text-sm cursor-pointer"
            title="Dismiss Recommendation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 relative z-10">
          {/* Service Badge & Detected Volume */}
          <div className="flex items-center justify-between p-3.5 bg-[#f5f3f0] rounded-xl border border-[#d0c5af]/30 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#5b5e66] uppercase font-bold tracking-wider">
                Target Endpoint
              </span>
              <span className="font-bold text-[#1b1c1a] text-sm flex items-center gap-1.5">
                {recommendation.serviceName}
                <span className="text-[10px] font-mono text-[#735c00] bg-[#d4af37]/15 px-1.5 py-0.5 rounded font-normal">
                  {recommendation.category}
                </span>
              </span>
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[10px] text-[#5b5e66] uppercase font-bold tracking-wider">
                Estimated Volume
              </span>
              <span className="font-bold text-[#1b1c1a] font-mono text-sm">
                {recommendation.callCount.toLocaleString()} Calls
              </span>
            </div>
          </div>

          {/* Side-by-Side Economic Comparison */}
          <div className="grid grid-cols-2 gap-3">
            {/* Option A: Pay-Per-Call */}
            <div className="p-4 rounded-xl bg-red-50/60 border border-red-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-red-700">
                <span>Pay-Per-Call</span>
                <span className="text-[10px] uppercase font-mono">Current Rail</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-red-900 font-mono tracking-tight">
                  ${recommendation.projectedPayPerCallCost.toFixed(2)}{" "}
                  <span className="text-xs font-medium text-red-700">USDC</span>
                </div>
                <p className="text-[11px] text-red-700 mt-0.5">
                  ${recommendation.payPerCallPriceUsdc.toFixed(4)} per call × {recommendation.callCount.toLocaleString()}
                </p>
              </div>
              <div className="text-[10px] text-red-600 bg-red-100/70 px-2 py-1 rounded">
                ⚠️ Continuous balance drain
              </div>
            </div>

            {/* Option B: 30-Day Flat Rental (Recommended) */}
            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500/40 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#10b981] text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-bl-lg">
                Recommended
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                <span>30-Day Rental</span>
                <span className="text-[10px] font-bold text-emerald-600">Save {recommendation.savingsPercent}%</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-emerald-900 font-mono tracking-tight">
                  ${recommendation.rentalPriceUsdc.toFixed(2)}{" "}
                  <span className="text-xs font-medium text-emerald-700">USDC</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  10,000 calls prepaid (~$0.0001/call)
                </p>
              </div>
              <div className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-1 rounded font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                Saves ${recommendation.netSavingsUsdc.toFixed(2)} USDC
              </div>
            </div>
          </div>

          {/* LLM Economic Analysis Box */}
          <div className="p-3.5 bg-gradient-to-r from-[#f9f8f6] to-[#f4f2ee] rounded-xl border border-[#d4af37]/25 text-xs text-[#30312f] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#735c00]">
              <Sparkles className="w-3.5 h-3.5 text-[#735c00]" />
              <span>AI Advisor Rationale</span>
            </div>
            <p className="text-[11px] text-[#4d4635] leading-relaxed">
              {recommendation.llmAnalysis}
            </p>
          </div>

          {/* Cross-Platform Real-time Notice */}
          <div className="text-[11px] text-[#5b5e66] flex items-center justify-between px-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#5b5e66]" />
              Until rented, tasks continue in Pay-Per-Call mode.
            </span>
            <span className="text-[10px] text-[#735c00] font-semibold">
              Syncs with Mobile App
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              onClick={handleRent}
              disabled={isSubmitting || justRented}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c39e26] hover:from-[#c39e26] hover:to-[#b38f20] text-white font-bold text-xs shadow-[0_4px_16px_rgba(212,175,55,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {justRented ? (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>30-Day Lease Activated!</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-white fill-white" />
                  <span>
                    {isSubmitting
                      ? "Activating Rental Lease..."
                      : `⚡ 1-Click Rent Service ($${recommendation.rentalPriceUsdc.toFixed(2)} USDC / 30 Days)`}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              disabled={isSubmitting}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-[#efeeeb] hover:bg-[#eae8e5] text-[#4d4635] font-semibold text-xs transition-colors cursor-pointer"
            >
              Continue Pay-Per-Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
