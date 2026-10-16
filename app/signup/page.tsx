"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Bot,
  Zap,
  Check,
  Lock,
  Eye,
  EyeOff,
  Mail,
  User as UserIcon,
  Key,
  Wallet,
  CreditCard,
  ArrowRight,
  Info,
  AlertTriangle,
  X,
  BadgeCheck,
  Coins,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dynamic 3-segment password strength calculation
  const getPasswordStrength = () => {
    if (!password || password.length < 3) {
      return { score: 0, label: "Too Short", color: "text-[#7f7663]" };
    }
    if (password.length < 6) {
      return { score: 1, label: "Fair", color: "text-[#715d00]" };
    }
    if (password.length < 10) {
      return { score: 2, label: "Good", color: "text-[#735c00]" };
    }
    return { score: 3, label: "Strong", color: "text-[#735c00]" };
  };

  const strength = getPasswordStrength();

  const handleRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) {
      setErrorMessage("Please accept the testnet protocol notice to proceed.");
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to create account. Please try again.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Account created! Redirecting to dashboard...");

      setTimeout(() => {
        if (role === "seller") {
          router.push("/provider");
        } else {
          router.push("/");
        }
        router.refresh();
      }, 1000);
    } catch {
      setErrorMessage("Network connection error. Please check your network and try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#fbf9f6] text-[#1b1c1a] min-h-screen flex flex-col justify-between selection:bg-[#d4af37]/30 selection:text-[#554300] font-sans antialiased">
      {/* ================= FIXED GLOBAL HEADER ================= */}
      <header className="fixed top-0 w-full z-50 bg-[#fbf9f6]/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(212,175,55,0.06)] border-b border-[#d4af37]/10">
        <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <img
                alt="AgentBucket Logo"
                className="h-8 w-8 object-contain rounded-lg border border-[#d4af37]/30"
                src="/bots/bot-2.svg"
              />
              <span className="text-xl font-bold text-[#1b1c1a] tracking-tight hidden sm:inline-block">
                AgentBucket
              </span>
            </Link>

            <div className="h-4 w-px bg-[#d0c5af]/60 mx-1 hidden md:block"></div>

            <div className="hidden md:flex items-center gap-1.5 bg-[#eae8e5] px-3 py-1 rounded-full shadow-[0_2px_6px_-1px_rgba(13,17,23,0.04)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#735c00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#735c00]"></span>
              </span>
              <span className="text-[11px] font-bold uppercase text-[#1b1c1a] tracking-wider">
                Base Sepolia Testnet
              </span>
              <span className="text-[11px] text-[#4d4635] font-normal">(84532)</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 p-1 bg-[#efeeeb] rounded-lg">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-[#4d4635] hover:text-[#1b1c1a] hover:bg-[#eae8e5] transition-colors rounded"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                aria-current="page"
                className="px-3.5 py-1.5 transition-colors bg-[#d4af37] text-[#554300] font-semibold text-xs rounded-lg shadow-sm"
              >
                Register
              </Link>
              <Link
                href="/docs"
                className="px-3.5 py-1.5 text-xs font-semibold text-[#4d4635] hover:text-[#1b1c1a] hover:bg-[#eae8e5] transition-colors rounded hidden sm:inline-block"
              >
                Docs & Support
              </Link>
            </nav>

            <img
              alt="Avatar"
              src="/bots/bot-3.svg"
              className="w-8 h-8 rounded-full object-cover shadow-sm border border-[#d4af37]/30"
            />
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="w-full pt-16 flex-1 flex flex-col bg-[#fbf9f6]">
        <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
          {/* Ambient Golden Glow Orbs (Contained) */}
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#d4af37]/10 blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/2 -right-40 w-[30rem] h-[30rem] rounded-full bg-[#e9c349]/15 blur-3xl pointer-events-none"></div>

          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">
            {/* ================= LEFT HERO SHOWCASE ================= */}
            <div className="lg:col-span-6 flex flex-col justify-between pt-3 lg:pr-6 space-y-8">
              <div className="space-y-6">
                {/* Live Network Status Pill & Micro Badge */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center gap-2 bg-[#efeeeb] px-3 py-1 rounded-full shadow-sm border border-[#d4af37]/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#735c00] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#735c00]"></span>
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1b1c1a]">
                      Base Sepolia Testnet
                    </span>
                    <span className="text-[11px] text-[#4d4635] font-normal">| Chain ID 84532</span>
                  </div>

                  <div className="inline-flex items-center gap-1 bg-[#d4af37]/15 text-[#735c00] px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-[#735c00]" />
                    <span>HTTP 402 Protocol</span>
                  </div>
                </div>

                {/* Brand Mark & Glowing Icon */}
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center p-1 border border-[#d4af37]/30">
                    <img
                      alt="AgentBucket Logo"
                      className="w-full h-full object-cover rounded-lg"
                      src="/bots/bot-4.svg"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-widest text-[#735c00] font-bold">
                      Autonomous Protocol
                    </span>
                    <span className="text-xl font-bold text-[#1b1c1a] tracking-tight">
                      AgentBucket Registry
                    </span>
                  </div>
                </div>

                {/* Gilded Headline & Value Tagline */}
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#1b1c1a] leading-tight tracking-tight">
                    Monetize Your APIs or Deploy{" "}
                    <span className="bg-gradient-to-r from-[#735c00] to-[#d4af37] bg-clip-text text-transparent">
                      Autonomous Buyers.
                    </span>
                  </h1>
                  <p className="text-base text-[#4d4635] max-w-xl leading-relaxed">
                    The autonomous agent marketplace powered by native HTTP 402 micro-transactions and programmatic micropayments.
                  </p>
                </div>

                {/* DUAL VALUE CARDS (Sellers & Buyers) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Seller Card */}
                  <div className="group relative bg-white p-4 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08)] hover:shadow-md transition-all duration-300 border border-[#d4af37]/20">
                    <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center mb-2.5 text-[#735c00]">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-[#735c00] font-bold mb-1">
                      For Sellers
                    </div>
                    <p className="text-xs text-[#1b1c1a] leading-relaxed">
                      List your Python / Node scraper, AI model, or data API in the Registry and get paid in USDC instantly on every call.
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-[11px] text-[#4d4635]">
                      <BadgeCheck className="w-3.5 h-3.5 text-[#735c00]" />
                      <span>Zero gateway fee testnet</span>
                    </div>
                  </div>

                  {/* Buyer Card */}
                  <div className="group relative bg-white p-4 rounded-xl shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08)] hover:shadow-md transition-all duration-300 border border-[#d4af37]/20">
                    <div className="w-8 h-8 rounded-lg bg-[#efeeeb] flex items-center justify-center mb-2.5 text-[#735c00]">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-[#735c00] font-bold mb-1">
                      For Buyers
                    </div>
                    <p className="text-xs text-[#1b1c1a] leading-relaxed">
                      Give Scout a goal and budget. It selects tools, pays per request, and compiles the verified analytical report.
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-[11px] text-[#4d4635]">
                      <Coins className="w-3.5 h-3.5 text-[#735c00]" />
                      <span>Pay-as-you-go micro gas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* COMPANION CHARACTER PERCH (Voxel Bot Scout) */}
              <div className="relative bg-[#f5f3f0] rounded-2xl p-4 shadow-sm border border-[#d4af37]/20 mt-4">
                <div className="flex items-center gap-4">
                  {/* Voxel Bot Overlap Avatar */}
                  <div className="relative -mt-6 sm:-mt-8 shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 shadow-md border-2 border-[#d4af37] overflow-hidden">
                      <img
                        alt="Agent Scout Bot"
                        className="w-full h-full object-cover"
                        src="/bots/bot-1.svg"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#735c00] flex items-center justify-center text-white text-[10px]">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Companion Text & Status Badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#554300] text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#735c00] animate-pulse"></span>
                        Agent Scout Ready to Deploy
                      </span>
                      <span className="text-[11px] text-[#4d4635] font-mono">v1.4.2</span>
                    </div>
                    <p className="text-xs text-[#4d4635] line-clamp-2 leading-relaxed">
                      &quot;Ready to scan x402 endpoints, compare latency, and negotiate per-chunk gas pricing for your pipelines.&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= RIGHT CARD SIGNUP FORM ================= */}
            <div className="lg:col-span-6 w-full">
              <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-[0_12px_36px_-6px_rgba(212,175,55,0.12),0_4px_16px_rgba(13,17,23,0.06)] border border-[#d4af37]/30">
                {/* Card Decorative Top Edge Gilded Line */}
                <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent rounded-t-full"></div>

                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-2xl font-bold text-[#1b1c1a] tracking-tight">
                      Create your AgentBucket Account
                    </h2>
                    <Key className="w-6 h-6 text-[#735c00]" />
                  </div>
                  <p className="text-xs text-[#4d4635]">
                    Get started in 30 seconds. No credit card or KYC required.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div
                    className="flex items-start justify-between gap-2.5 p-3.5 mb-4 rounded-xl bg-[#ffdad6] text-[#93000a] border border-[#ffdad6] shadow-sm text-xs"
                    role="alert"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#93000a]">Registration Notice</p>
                        <p className="leading-snug">{errorMessage}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setErrorMessage(null)}
                      className="p-1 rounded text-[#93000a] hover:bg-[#ffdad6]/70 transition-colors"
                      type="button"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Form Element */}
                <form id="signup-form" onSubmit={handleRegistration} className="space-y-4">
                  {/* FIELD 1: Full Name / Developer Alias */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        className="text-xs font-semibold uppercase tracking-wider text-[#1b1c1a]"
                        htmlFor="alias-input"
                      >
                        Full Name / Developer Alias
                      </label>
                      <span
                        className="text-[#d0c5af] hover:text-[#7f7663] cursor-help"
                        title="Your public registry alias visible in audit trails."
                      >
                        <Info className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#7f7663] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="alias-input"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Johnson (or Scout Ops)"
                        className="w-full bg-[#f5f3f0] border border-[#d0c5af]/60 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#1b1c1a] placeholder:text-[#7f7663] outline-none transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-[#4d4635]">
                      Your display name visible on the marketplace registry and audit trails.
                    </p>
                  </div>

                  {/* FIELD 2: Developer Email */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        className="text-xs font-semibold uppercase tracking-wider text-[#1b1c1a]"
                        htmlFor="email-input"
                      >
                        Email Address
                      </label>
                      <span
                        className="text-[#d0c5af] hover:text-[#7f7663] cursor-help"
                        title="Alerts for critical low-budget thresholds and API key changes."
                      >
                        <Info className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#7f7663] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full bg-[#f5f3f0] border border-[#d0c5af]/60 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#1b1c1a] placeholder:text-[#7f7663] outline-none transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-[#4d4635]">
                      Used for account login and critical budget exhaustion alerts.
                    </p>
                  </div>

                  {/* FIELD 3: Password + Interactive Golden Strength Meter */}
                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold uppercase tracking-wider text-[#1b1c1a]"
                      htmlFor="password-input"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#7f7663] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="password-input"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full bg-[#f5f3f0] border border-[#d0c5af]/60 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 rounded-lg pl-10 pr-10 py-2.5 text-xs text-[#1b1c1a] placeholder:text-[#7f7663] outline-none transition-all"
                      />
                      <button
                        type="button"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f7663] hover:text-[#1b1c1a] transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Interactive Golden Strength Indicator (3 segments) */}
                    <div className="pt-1 space-y-1">
                      <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
                        <div
                          id="meter-bar-1"
                          className={`h-full rounded-full transition-all duration-300 ${
                            strength.score >= 1 ? "bg-[#d4af37]" : "bg-[#e4e2df]"
                          }`}
                        ></div>
                        <div
                          id="meter-bar-2"
                          className={`h-full rounded-full transition-all duration-300 ${
                            strength.score >= 2 ? "bg-[#d4af37]" : "bg-[#e4e2df]"
                          }`}
                        ></div>
                        <div
                          id="meter-bar-3"
                          className={`h-full rounded-full transition-all duration-300 ${
                            strength.score >= 3 ? "bg-[#d4af37]" : "bg-[#e4e2df]"
                          }`}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#4d4635]">
                        <span>Must be at least 6 characters. We recommend combining letters &amp; numbers.</span>
                        <span className={`font-semibold ${strength.color}`} id="strength-label">
                          {strength.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FIELD 4: Interactive Role Pill Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#1b1c1a]">
                      I want to primarily:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="role-selector">
                      {/* Option 1: Buyer (Active default) */}
                      <button
                        id="role-buyer-btn"
                        type="button"
                        onClick={() => setRole("buyer")}
                        className={`role-pill flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
                          role === "buyer"
                            ? "border-2 border-[#d4af37] bg-[#d4af37]/10 text-[#1b1c1a] ring-2 ring-[#d4af37]/30"
                            : "border border-[#d0c5af]/60 bg-[#f5f3f0] text-[#1b1c1a] hover:bg-[#efeeeb]"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-[#735c00] shadow-sm">
                          <Bot className="w-4 h-4 text-[#735c00]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#1b1c1a]">Hire Agents</div>
                          <div className="text-[10px] text-[#4d4635]">(Buyer)</div>
                        </div>
                        <span className="shrink-0 flex items-center justify-center">
                          {role === "buyer" ? (
                            <span className="w-4 h-4 rounded-full border-2 border-[#735c00] flex items-center justify-center">
                              <span className="w-2 h-2 rounded-full bg-[#735c00]"></span>
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-[#d0c5af]"></span>
                          )}
                        </span>
                      </button>

                      {/* Option 2: Seller */}
                      <button
                        id="role-seller-btn"
                        type="button"
                        onClick={() => setRole("seller")}
                        className={`role-pill flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
                          role === "seller"
                            ? "border-2 border-[#d4af37] bg-[#d4af37]/10 text-[#1b1c1a] ring-2 ring-[#d4af37]/30"
                            : "border border-[#d0c5af]/60 bg-[#f5f3f0] text-[#1b1c1a] hover:bg-[#efeeeb]"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-[#5b5e66] shadow-sm">
                          <Zap className="w-4 h-4 text-[#5b5e66]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#1b1c1a]">Sell APIs / Models</div>
                          <div className="text-[10px] text-[#4d4635]">(Seller)</div>
                        </div>
                        <span className="shrink-0 flex items-center justify-center">
                          {role === "seller" ? (
                            <span className="w-4 h-4 rounded-full border-2 border-[#735c00] flex items-center justify-center">
                              <span className="w-2 h-2 rounded-full bg-[#735c00]"></span>
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-[#d0c5af]"></span>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Consent Golden Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded accent-[#735c00] text-[#735c00] focus:ring-[#d4af37]"
                        required
                      />
                      <span className="text-xs text-[#1b1c1a] leading-snug">
                        I understand this platform settles micro-transactions on testnet stablecoins (USDC) via{" "}
                        <span className="font-semibold text-[#735c00]">HTTP 402</span>.
                      </span>
                    </label>
                  </div>

                  {/* Submit Primary Button */}
                  <div className="pt-1">
                    <button
                      id="submit-btn"
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-[#d4af37] hover:brightness-105 active:scale-[0.99] text-[#554300] text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-75"
                    >
                      <span>Create Free Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* Interactive Loading State Demo Box */}
                  {isLoading && (
                    <div
                      id="loading-feedback"
                      className="p-2.5 bg-[#efeeeb] rounded-lg flex items-center justify-center gap-2.5 text-[#735c00] text-xs font-semibold"
                    >
                      <span className="animate-spin h-4 w-4 border-2 border-[#735c00] border-t-transparent rounded-full"></span>
                      <span>Setting up AgentBucket workspace &amp; generating testnet keypair...</span>
                    </div>
                  )}

                  {/* Success State Box */}
                  {successMessage && (
                    <div className="p-2.5 bg-[#efeeeb] rounded-lg flex items-center justify-center gap-2 text-[#735c00] text-xs font-semibold">
                      <BadgeCheck className="w-5 h-5 text-[#735c00]" />
                      <span>{successMessage}</span>
                    </div>
                  )}
                </form>

                {/* Footer Switcher Link */}
                <div className="mt-6 pt-4 border-t border-[#d0c5af]/30 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="text-[#4d4635]">Already registered?</span>
                  <Link
                    href="/login"
                    data-path="login"
                    className="inline-flex items-center gap-1 font-bold text-[#735c00] hover:text-[#554300] transition-colors"
                  >
                    <span>Sign in to existing account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Bottom Security Badges */}
                <div className="mt-4 pt-1 grid grid-cols-3 gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[#f5f3f0] text-[#4d4635] justify-center">
                    <Key className="w-4 h-4 text-[#735c00]" />
                    <span className="truncate">Instant API Keys</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[#f5f3f0] text-[#4d4635] justify-center">
                    <Wallet className="w-4 h-4 text-[#735c00]" />
                    <span className="truncate">Non-custodial</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[#f5f3f0] text-[#4d4635] justify-center">
                    <CreditCard className="w-4 h-4 text-[#735c00]" />
                    <span className="truncate">No Credit Card</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ================= GLOBAL FOOTER ================= */}
      <footer className="w-full bg-[#f5f3f0] py-3.5 mt-auto border-t border-[#d4af37]/15">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-[#4d4635]">
              © 2025 AgentBucket Atelier
            </span>
            <span className="text-[#d0c5af]">•</span>
            <span className="text-[11px] font-semibold text-[#735c00]">Chain ID 84532</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/docs"
              className="text-[11px] text-[#4d4635] hover:text-[#1b1c1a] transition-colors"
            >
              Security &amp; Key Management
            </Link>
            <Link
              href="/docs"
              className="text-[11px] text-[#4d4635] hover:text-[#1b1c1a] transition-colors"
            >
              Atelier Protocol Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
