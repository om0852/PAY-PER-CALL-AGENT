"use client";

import React from "react";

// Base Shimmer Block
export function SkeletonBlock({
  className = "",
  dark = false,
  style,
}: {
  className?: string;
  dark?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`rounded-lg ${
        dark ? "skeleton-shimmer-dark bg-slate-800" : "skeleton-shimmer bg-[#efeeeb]"
      } ${className}`}
    />
  );
}

// 1. OVERVIEW PAGE SKELETON
export function OverviewSkeleton() {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Studio Banner */}
      <section className="relative w-full bg-white rounded-xl p-6 md:p-8 shadow-sm border border-[#d4af37]/20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2.5 max-w-2xl w-full">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-4 w-28 rounded-full" />
            </div>
            <SkeletonBlock className="h-8 w-3/4 max-w-md" />
            <div className="flex items-center gap-3 pt-1">
              <SkeletonBlock className="h-7 w-32" />
              <SkeletonBlock className="h-7 w-56" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end lg:items-center gap-4 w-full lg:w-auto">
            <div className="bg-[#f5f3f0] p-3 rounded-xl flex items-center gap-3 border border-[#d4af37]/25 w-64">
              <SkeletonBlock className="w-12 h-12 rounded-lg shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <SkeletonBlock className="h-3.5 w-20" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-4/5" />
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <SkeletonBlock className="h-8 w-44 rounded-lg" />
              <SkeletonBlock className="h-7 w-36 rounded-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* 4 Top KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-5 shadow-sm border border-[#d4af37]/15 flex flex-col justify-between gap-4 h-36"
          >
            <div className="flex items-start justify-between">
              <SkeletonBlock className="h-3.5 w-28" />
              <SkeletonBlock className="w-9 h-9 rounded-lg" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-7 w-32" />
              <SkeletonBlock className="h-3 w-40" />
            </div>
          </div>
        ))}
      </section>

      {/* Grid: Chart + Services Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/15 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <SkeletonBlock className="h-5 w-44" />
              <SkeletonBlock className="h-3 w-64" />
            </div>
            <SkeletonBlock className="h-7 w-28 rounded-lg" />
          </div>
          {/* Simulated chart bars */}
          <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2 border-b border-[#efeeeb]">
            {[40, 65, 30, 85, 50, 95, 70, 45, 80, 60, 90, 75].map((h, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <SkeletonBlock className="w-full rounded-t-md" style={{ height: `${h}%` } as React.CSSProperties} />
                <SkeletonBlock className="h-2.5 w-full max-w-[24px]" />
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Live Endpoints Health */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/15 space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="h-4 w-16 rounded-full" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="p-3 rounded-lg bg-[#fbf9f6] border border-[#efeeeb] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1">
                  <SkeletonBlock className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <SkeletonBlock className="h-3.5 w-24" />
                    <SkeletonBlock className="h-2.5 w-36" />
                  </div>
                </div>
                <SkeletonBlock className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Ledger Table */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/15 space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-5 w-48" />
          <SkeletonBlock className="h-8 w-56 rounded-lg" />
        </div>
        <div className="space-y-2.5 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between p-3.5 rounded-lg border border-[#efeeeb] gap-4">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// 2. DISPATCHER PAGE SKELETON
export function DispatcherSkeleton() {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-4 w-24 rounded-full" />
          </div>
          <SkeletonBlock className="h-7 w-72" />
          <SkeletonBlock className="h-3.5 w-96 max-w-full" />
        </div>
        <SkeletonBlock className="h-9 w-40 rounded-lg" />
      </div>

      {/* Split Grid: Mission Control (Left) & Micro-Transactions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mission Control */}
        <div className="lg:col-span-5 bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/15 space-y-5">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-5 w-20 rounded-full" />
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <SkeletonBlock className="h-3.5 w-28" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((p) => (
                <SkeletonBlock key={p} className="h-8 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Prompt Textarea Placeholder */}
          <div className="space-y-2">
            <SkeletonBlock className="h-3.5 w-32" />
            <div className="p-4 rounded-xl border border-[#efeeeb] bg-[#fbf9f6] space-y-2.5">
              <SkeletonBlock className="h-3.5 w-full" />
              <SkeletonBlock className="h-3.5 w-4/5" />
              <SkeletonBlock className="h-3.5 w-2/3" />
            </div>
          </div>

          {/* Budget & Concurrency */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-9 rounded-lg" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-9 rounded-lg" />
            </div>
          </div>

          {/* Launch Button */}
          <SkeletonBlock className="h-12 w-full rounded-xl bg-[#d4af37]/40" />
        </div>

        {/* Right Column: Micro-Transactions Stream Terminal */}
        <div className="lg:col-span-7 bg-[#1b1c1a] rounded-xl p-6 shadow-lg border border-[#30312f] space-y-4">
          <div className="flex items-center justify-between border-b border-[#30312f] pb-4">
            <div className="space-y-1.5">
              <SkeletonBlock dark className="h-5 w-64" />
              <SkeletonBlock dark className="h-3 w-40" />
            </div>
            <SkeletonBlock dark className="h-6 w-24 rounded-full" />
          </div>

          {/* Step Cards */}
          <div className="space-y-3 pt-2">
            {[
              { cat: "Scraping", price: "0.050 USDC" },
              { cat: "FX Rates", price: "0.020 USDC" },
              { cat: "Data Converted", price: "0.040 USDC" },
              { cat: "Sentiment NLP", price: "0.030 USDC" },
              { cat: "Hindi Summary", price: "0.075 USDC" },
              { cat: "AML Compliance", price: "0.060 USDC" },
            ].map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-[#252624] border border-[#353634] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 flex-1">
                  <SkeletonBlock dark className="w-7 h-7 rounded-md shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <SkeletonBlock dark className="h-3.5 w-24" />
                      <SkeletonBlock dark className="h-4 w-16 rounded-full" />
                    </div>
                    <SkeletonBlock dark className="h-2.5 w-3/4" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <SkeletonBlock dark className="h-4 w-18" />
                  <SkeletonBlock dark className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. SERVICES DIRECTORY SKELETON
export function ServicesSkeleton() {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <SkeletonBlock className="h-6 w-60" />
          <SkeletonBlock className="h-3.5 w-96 max-w-full" />
        </div>
        <SkeletonBlock className="h-9 w-44 rounded-lg" />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#d4af37]/15 flex flex-col sm:flex-row items-center justify-between gap-4">
        <SkeletonBlock className="h-9 w-full sm:w-72 rounded-lg" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {[1, 2, 3, 4].map((f) => (
            <SkeletonBlock key={f} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d4af37]/15 overflow-hidden">
        <div className="p-4 border-b border-[#efeeeb] flex items-center justify-between">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
        <div className="divide-y divide-[#efeeeb]">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <SkeletonBlock className="w-10 h-10 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-4 w-36" />
                    <SkeletonBlock className="h-4 w-20 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-3 w-56" />
                </div>
              </div>
              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div className="space-y-1">
                  <SkeletonBlock className="h-3 w-16" />
                  <SkeletonBlock className="h-4 w-20" />
                </div>
                <SkeletonBlock className="h-6 w-20 rounded-full" />
                <SkeletonBlock className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 4. TRANSACTIONS / LEDGER SKELETON
export function TransactionsSkeleton() {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((k) => (
          <div key={k} className="bg-white rounded-xl p-5 shadow-sm border border-[#d4af37]/15 flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonBlock className="h-3.5 w-28" />
              <SkeletonBlock className="h-7 w-24" />
            </div>
            <SkeletonBlock className="w-10 h-10 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Ledger Table Filter & Content */}
      <div className="bg-white rounded-xl shadow-sm border border-[#d4af37]/15 overflow-hidden space-y-4 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#efeeeb] pb-4">
          <div className="space-y-1">
            <SkeletonBlock className="h-5 w-48" />
            <SkeletonBlock className="h-3 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-8 w-48 rounded-lg" />
            <SkeletonBlock className="h-8 w-28 rounded-lg" />
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((tx) => (
            <div
              key={tx}
              className="p-4 rounded-xl border border-[#efeeeb] bg-[#fbf9f6] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1">
                <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-4 w-44 font-mono" />
                    <SkeletonBlock className="h-4 w-20 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-3 w-64" />
                </div>
              </div>
              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right space-y-1">
                  <SkeletonBlock className="h-4 w-20" />
                  <SkeletonBlock className="h-3 w-16" />
                </div>
                <SkeletonBlock className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 5. ANALYTICS SKELETON
export function AnalyticsSkeleton() {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#d4af37]/15 space-y-3">
            <div className="flex justify-between">
              <SkeletonBlock className="h-3.5 w-24" />
              <SkeletonBlock className="w-8 h-8 rounded-lg" />
            </div>
            <SkeletonBlock className="h-7 w-28" />
            <SkeletonBlock className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/15 space-y-4">
          <div className="flex justify-between items-center">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-6 w-24 rounded-lg" />
          </div>
          <div className="h-60 flex items-end justify-between gap-3 pt-6 border-b border-[#efeeeb]">
            {[50, 70, 40, 90, 60, 80, 65, 85].map((h, idx) => (
              <SkeletonBlock key={idx} className="flex-1 rounded-t-md" style={{ height: `${h}%` } as React.CSSProperties} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/15 space-y-4">
          <div className="flex justify-between items-center">
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="h-6 w-20 rounded-lg" />
          </div>
          <div className="h-60 flex items-center justify-center">
            <SkeletonBlock className="w-40 h-40 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. REVENUE / ESCROW SKELETON
export function RevenueSkeleton() {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Escrow Pool Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-md">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-9 w-48" />
          <SkeletonBlock className="h-3.5 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-32 rounded-lg" />
          <SkeletonBlock className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Relayer & Payout Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/15 space-y-4">
          <SkeletonBlock className="h-5 w-44" />
          <div className="space-y-3">
            {[1, 2, 3].map((w) => (
              <div key={w} className="p-3.5 rounded-lg border border-[#efeeeb] flex justify-between items-center">
                <div className="space-y-1.5">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-48 font-mono" />
                </div>
                <SkeletonBlock className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/15 space-y-4">
          <SkeletonBlock className="h-5 w-48" />
          <div className="space-y-3">
            {[1, 2, 3].map((p) => (
              <div key={p} className="p-3.5 rounded-lg border border-[#efeeeb] flex justify-between items-center">
                <div className="space-y-1.5">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-3 w-36" />
                </div>
                <SkeletonBlock className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 7. DEVELOPER API KEYS & SDK SKELETON
export function ApiSkeleton() {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-56" />
          <SkeletonBlock className="h-3.5 w-80" />
        </div>
        <SkeletonBlock className="h-9 w-36 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#d4af37]/15 space-y-4">
          <SkeletonBlock className="h-5 w-40" />
          <div className="p-4 rounded-xl bg-[#fbf9f6] border border-[#efeeeb] space-y-3">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-9 w-full rounded-lg" />
            <SkeletonBlock className="h-3 w-48" />
          </div>
        </div>

        <div className="bg-[#1b1c1a] rounded-xl p-6 shadow-lg border border-[#30312f] space-y-4">
          <div className="flex justify-between items-center border-b border-[#30312f] pb-3">
            <SkeletonBlock dark className="h-4 w-32" />
            <SkeletonBlock dark className="h-4 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock dark className="h-3 w-full" />
            <SkeletonBlock dark className="h-3 w-4/5" />
            <SkeletonBlock dark className="h-3 w-2/3" />
            <SkeletonBlock dark className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// 8. TX EXPLORER SKELETON (FOR /tx/[hash])
export function TxExplorerSkeleton() {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Overview Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <SkeletonBlock dark className="h-3 w-32" />
            <SkeletonBlock dark className="h-7 w-72 md:w-96 font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock dark className="h-7 w-28 rounded-full" />
            <SkeletonBlock dark className="h-7 w-24 rounded-full" />
          </div>
        </div>

        {/* 4 Detail Grid Cells */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <SkeletonBlock dark className="h-2.5 w-20" />
              <SkeletonBlock dark className="h-5 w-28" />
            </div>
          ))}
        </div>

        {/* Authorization Box */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBlock dark className="h-4 w-48" />
            <SkeletonBlock dark className="h-4 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <SkeletonBlock dark className="h-10 rounded-lg" />
            <SkeletonBlock dark className="h-10 rounded-lg" />
            <SkeletonBlock dark className="h-10 rounded-lg" />
            <SkeletonBlock dark className="h-10 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
