"use client";

import React from "react";
import { HelpCircle, LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  tooltip: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  value: string;
  unit?: string;
  trendText?: string;
  trendPositive?: boolean;
  subtext: string;
}

export default function MetricCard({
  title,
  tooltip,
  icon: Icon,
  iconBgColor = "bg-[#d4af37]/15",
  iconColor = "text-[#735c00]",
  value,
  unit,
  trendText,
  trendPositive = true,
  subtext,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 relative overflow-hidden group border border-[#d4af37]/15">
      {/* Top Row: Title + Tooltip + Icon */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] font-bold">
            {title}
          </span>
          <div className="relative group/tooltip flex items-center">
            <HelpCircle className="w-3.5 h-3.5 text-[#5b5e66] cursor-help" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 p-2 bg-[#30312f] text-[#f2f0ed] text-[11px] leading-tight rounded-lg shadow-lg pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50">
              {tooltip}
            </div>
          </div>
        </div>

        <div className={`w-9 h-9 rounded-lg ${iconBgColor} flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Bottom Content: Value + Units + Trends */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#1b1c1a] font-mono tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-mono text-[#5b5e66] font-semibold">
              {unit}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {trendText && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                trendPositive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {trendText}
            </span>
          )}
          <span className="text-[11px] text-[#4d4635]">{subtext}</span>
        </div>
      </div>
    </div>
  );
}
