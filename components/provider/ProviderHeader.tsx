"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Copy,
  Check,
  BookOpen,
  Plus,
} from "lucide-react";

interface ProviderHeaderProps {
  sellerAddress?: string;
  sellerLabel?: string;
  onRegisterClick?: () => void;
  onCopyToast?: (msg: string) => void;
}

export default function ProviderHeader({
  sellerAddress = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  sellerLabel = "AuraNode Labs",
  onRegisterClick,
  onCopyToast,
}: ProviderHeaderProps) {
  const [copied, setCopied] = useState(false);

  const truncatedAddress = `${sellerAddress.slice(0, 6)}...${sellerAddress.slice(-4)}`;

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(sellerAddress);
    setCopied(true);
    if (onCopyToast) onCopyToast("Seller wallet address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-[#fbf9f6]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-6 border-b border-[#d4af37]/15">
      {/* Left: Network & Payout Wallet */}
      <div className="flex items-center gap-4">
        {/* Network Pill */}
        <div className="flex items-center gap-2 px-3 py-1 bg-[#efeeeb] rounded-full shadow-[0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/20">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
          <span className="text-[11px] font-bold text-[#1b1c1a] tracking-wide">
            Base Sepolia (84532)
          </span>
        </div>

        {/* Payout Wallet Pill */}
        <div className="flex items-center gap-2 bg-[#f5f3f0] px-3 py-1 rounded-full border border-[#d0c5af]/50">
          <Wallet className="w-3.5 h-3.5 text-[#735c00]" />
          <span className="text-xs font-mono text-[#1b1c1a] font-medium">
            {truncatedAddress}
          </span>
          <button
            onClick={handleCopyWallet}
            className="hover:text-[#735c00] transition-colors text-[#5b5e66] flex items-center ml-0.5"
            type="button"
            title="Copy full payout address"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Right: Actions, Register Service, Profile */}
      <div className="flex items-center gap-4">
        <Link
          href="/docs"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#4d4635] hover:text-[#1b1c1a] transition-colors"
        >
          <BookOpen className="w-4 h-4 text-[#5b5e66]" />
          <span>Docs</span>
        </Link>

        {/* Register Service Button */}
        <button
          onClick={onRegisterClick}
          type="button"
          className="flex items-center gap-1.5 bg-[#d4af37] text-[#554300] px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(212,175,55,0.25)] hover:brightness-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Register New Service</span>
        </button>

        <div className="h-5 w-px bg-[#d0c5af]"></div>

        {/* Provider Profile Badge */}
        <div className="flex items-center gap-2.5 pl-1">
          <img
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover shadow-[0_2px_6px_-1px_rgba(13,17,23,0.04)] border border-[#d4af37]/30"
            src="/bots/bot-3.svg"
          />
          <div className="hidden xl:flex flex-col">
            <span className="text-xs font-semibold text-[#1b1c1a] leading-none">
              {sellerLabel}
            </span>
            <span className="text-[10px] text-[#5b5e66] leading-tight">
              Verified Seller
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
