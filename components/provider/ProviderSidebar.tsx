"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  LayoutDashboard,
  Bot,
  Activity,
  Wallet,
  Key,
  Settings,
  ArrowLeftRight,
} from "lucide-react";

interface ProviderSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  healthyCount?: number;
  totalEndpoints?: number;
}

export default function ProviderSidebar({
  activeTab = "overview",
  onTabChange,
  healthyCount = 6,
  totalEndpoints = 6,
}: ProviderSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, href: "#overview" },
    { id: "services", label: "Agent Services", icon: Bot, href: "#services-section" },
    { id: "analytics", label: "Executions & Analytics", icon: Activity, href: "#analytics-section" },
    { id: "revenue", label: "Revenue & Escrow", icon: Wallet, href: "#ledger-section" },
    { id: "api", label: "API & Webhooks", icon: Key, href: "#protocol-section" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between border-r border-[#d4af37]/15">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 gap-3 bg-[#f5f3f0] border-b border-[#d4af37]/15">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center p-0.5 shadow-sm border border-[#d4af37]/30">
            <img
              src="/bots/bot-2.svg"
              alt="AgentBucket Logo"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-[#1b1c1a] leading-tight">
              AgentBucket
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#735c00] font-bold">
              Provider Studio
            </span>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-4 py-2 mt-2">
          <span className="text-[10px] uppercase tracking-wider text-[#5b5e66] px-2 font-bold">
            Workspace
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  if (onTabChange) {
                    e.preventDefault();
                    onTabChange(item.id);
                    const el = document.querySelector(item.href);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#d4af37] text-[#554300] font-bold shadow-[0_2px_8px_rgba(212,175,55,0.2)]"
                    : "text-[#4d4635] hover:bg-[#eae8e5] hover:text-[#1b1c1a]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#554300]" : "text-[#5b5e66]"}`} />
                <span>{item.label}</span>
              </a>
            );
          })}

          <div className="h-px bg-[#d0c5af]/40 my-2 mx-2"></div>

          {/* Switch to Buyer App */}
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium text-[#735c00] hover:bg-[#d4af37]/15 transition-all"
          >
            <ArrowLeftRight className="w-4 h-4 text-[#735c00]" />
            <span>Switch to Buyer Mode</span>
          </Link>
        </nav>
      </div>

      {/* Bottom Node Status Widget */}
      <div className="p-4 flex flex-col gap-3 bg-[#f5f3f0] border-t border-[#d4af37]/15">
        <div className="bg-white p-3 rounded-lg shadow-[0_2px_6px_-1px_rgba(13,17,23,0.04)] flex flex-col gap-1.5 border border-[#d0c5af]/30">
          <div className="flex items-center justify-between text-[10px]">
            <span className="uppercase text-[#5b5e66] font-bold">Node Status</span>
            <span className="text-[#1b1c1a] font-bold">99.98%</span>
          </div>
          <div className="w-full h-1.5 bg-[#eae8e5] rounded-full overflow-hidden">
            <div className="h-full bg-[#d4af37] rounded-full w-[99.98%]"></div>
          </div>
          <span className="text-[10px] text-[#4d4635]">
            All {healthyCount} endpoints active
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          <Link
            href="/provider/settings"
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-[#4d4635] hover:bg-[#eae8e5] hover:text-[#1b1c1a] transition-all"
          >
            <Settings className="w-4 h-4 text-[#5b5e66]" />
            <span>Studio Settings</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}
