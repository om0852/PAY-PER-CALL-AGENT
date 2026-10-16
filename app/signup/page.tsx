"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Coins,
  Zap,
  ShieldCheck,
  Shield,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  X,
  Info,
  Mail,
  User as UserIcon,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to create account. Please try again.");
        setIsLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage("Network connection error. Please check your network and try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#fbf9f6] text-[#1a1a1a] min-h-screen flex flex-col justify-between selection:bg-[#d4af37]/30 selection:text-[#554300] font-sans antialiased">
      {/* Global Header */}
      <header className="fixed top-0 w-full z-50 bg-[#fbf9f6]/90 backdrop-blur-xl border-b border-[#d4af37]/10 shadow-[0_1px_8px_rgba(212,175,55,0.06)]">
        <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="relative flex items-center gap-2.5">
              <img
                alt="AgentBucket Logo"
                className="h-8 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida/AEtjO1UIa34YfhyjxoiJa1OPacPFjZ06goXNFNXJlmdJ5sLWMOL31xNWqtSMz7E33RL2rVa3a4PKw-FYuBdSdlO_QpcGy3zWEmwvFjl7CscgKmBPfW0J_LmKsb3dLmnyJ1tzKa9b0gG6k5Y7GbdjZvGvPMevwlGCv9bDBlVIui-Y6tEP22yL2WOQ1lSqWCpl7H5ePIyo5xPmG3YEazX4A3Zls7v1Gp9Rd-FyHvYmG1cKsDROM88_3GjQkvDXNEau"
              />
              <span className="text-xl font-bold text-[#1a1a1a] tracking-tight hidden sm:inline-block">
                AgentBucket
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#d4af37]/20 text-[#735c00] border border-[#d4af37]/30 shadow-[0_0_8px_rgba(212,175,55,0.25)]">
                x402
              </span>
            </Link>

            <div className="h-4 w-px bg-[#d0c5af]/60 mx-1 hidden md:block"></div>

            <div className="hidden md:flex items-center gap-1.5 bg-[#eae8e5] px-2.5 py-1 rounded-full shadow-[0_2px_6px_-1px_rgba(13,17,23,0.04)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="text-[11px] font-bold uppercase text-[#1a1a1a] tracking-wider">
                Base Sepolia Testnet
              </span>
              <span className="text-[11px] text-[#4d4635] font-normal">(84532)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1.5 p-1 bg-[#efeeeb] rounded-xl text-xs font-semibold">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-[#4d4635] hover:text-[#1a1a1a] hover:bg-[#eae8e5] transition-colors rounded-lg"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 bg-[#d4af37] text-[#554300] font-bold rounded-lg shadow-sm"
              >
                Register
              </Link>
            </nav>
            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 shadow-sm text-white">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full pt-16 flex-1 flex flex-col bg-[#fbf9f6]">
        <div className="relative w-full min-h-[calc(100vh-4rem)] flex items-center overflow-hidden px-4 sm:px-6 lg:px-8 py-10">
          {/* Ambient Gilded Background Flares */}
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#d4af37]/10 blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-24 right-1/4 w-[30rem] h-[30rem] rounded-full bg-[#fee179]/15 blur-[120px] pointer-events-none"></div>

          <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: The Story / Hero Showcase (7 cols) */}
            <section className="lg:col-span-7 flex flex-col justify-between space-y-8 pr-0 lg:pr-6">
              {/* Network & Protocol Pill */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#efeeeb] shadow-[0_2px_8px_rgba(212,175,55,0.08)] border border-[#d4af37]/15 text-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-80"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span className="uppercase tracking-wider text-[#1a1a1a] font-bold">
                    Base Sepolia Testnet
                  </span>
                  <span className="text-[#7f7663]">|</span>
                  <span className="text-[#4d4635] font-mono">Chain ID 84532</span>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/30 text-[11px] uppercase tracking-wider text-[#554300] font-bold">
                  HTTP 402 Autonomous Gateway
                </span>
              </div>

              {/* Brand Identity & Headline */}
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-14 h-14 rounded-2xl bg-white p-2 border border-[#d4af37]/30 shadow-[0_4px_20px_-2px_rgba(212,175,55,0.25)] flex items-center justify-center shrink-0">
                    <img
                      alt="AgentBucket Logo"
                      className="w-full h-full object-contain"
                      src="https://lh3.googleusercontent.com/aida/AEtjO1UIa34YfhyjxoiJa1OPacPFjZ06goXNFNXJlmdJ5sLWMOL31xNWqtSMz7E33RL2rVa3a4PKw-FYuBdSdlO_QpcGy3zWEmwvFjl7CscgKmBPfW0J_LmKsb3dLmnyJ1tzKa9b0gG6k5Y7GbdjZvGvPMevwlGCv9bDBlVIui-Y6tEP22yL2WOQ1lSqWCpl7H5ePIyo5xPmG3YEazX4A3Zls7v1Gp9Rd-FyHvYmG1cKsDROM88_3GjQkvDXNEau"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#d4af37] ring-2 ring-white rounded-full shadow-sm"></span>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-[#735c00] font-bold">
                      Atelier Core Ledger
                    </p>
                    <h2 className="text-xl font-bold text-[#1a1a1a] tracking-tight">
                      AgentBucket Network
                    </h2>
                  </div>
                </div>

                <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1a1a1a] tracking-tight leading-[1.15]">
                  Start Building the{" "}
                  <span className="text-[#d4af37]">Agent Economy.</span>
                </h1>

                <p className="text-base text-[#4d4635] max-w-xl leading-relaxed">
                  Join the marketplace where software hires software. Deploy autonomous buyers that plan & pay per call, or register your APIs to earn USDC instantly.
                </p>
              </div>

              {/* 3 Feature Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Badge 1 */}
                <div className="p-4 rounded-2xl bg-white border border-[#d4af37]/20 shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-md transition-all">
                  <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 flex items-center justify-center text-[#735c00] mb-2.5">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-[#1a1a1a] mb-1 font-bold">
                    Zero Subscriptions
                  </div>
                  <p className="text-xs text-[#4d4635] leading-snug">
                    Pay only for the exact requests your agent consumes.
                  </p>
                </div>

                {/* Badge 2 */}
                <div className="p-4 rounded-2xl bg-white border border-[#d4af37]/20 shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-md transition-all">
                  <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 flex items-center justify-center text-[#735c00] mb-2.5">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-[#1a1a1a] mb-1 font-bold">
                    Instant Monetization
                  </div>
                  <p className="text-xs text-[#4d4635] leading-snug">
                    List your Python or Node tools and earn USDC per call directly to your wallet.
                  </p>
                </div>

                {/* Badge 3 */}
                <div className="p-4 rounded-2xl bg-white border border-[#d4af37]/20 shadow-[0_4px_20px_-2px_rgba(212,175,55,0.08),0_2px_6px_-1px_rgba(13,17,23,0.04)] hover:shadow-md transition-all">
                  <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 flex items-center justify-center text-[#735c00] mb-2.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-[#1a1a1a] mb-1 font-bold">
                    Verified Settlement
                  </div>
                  <p className="text-xs text-[#4d4635] leading-snug">
                    On-chain transparency with EIP-712 cryptographic proofs on Base Sepolia.
                  </p>
                </div>
              </div>

              {/* Mascot Status Box */}
              <div className="relative flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#efeeeb] to-[#f5f3f0] border border-[#d4af37]/25 shadow-[0_2px_12px_rgba(212,175,55,0.08)] overflow-hidden">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm border border-[#d4af37]/30 bg-[#d1d4f9]">
                    <img
                      alt="Voxel Sentinel"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida/AEtjO1VeuBtt0PRIj9ExYL1tsoVLfRg_ReQniiUQJe7QZlpV_aOvS3gm07H6iWKiZHyCeYCKpoyLA37vNpc8D07XbhEW1ksojNKFlI_HDJujKD2V912H5sJijuZ9R0JTqHFxKrozrBCVWY5D9MgAoVD1Pkar3dCAIkk0Pqqn_LDWEmY5ds58owhm00T0ahMcyo9nQPkkc7kMVemhKMLjL_dAGctwJJAv7cRs_E_18kwPk0p5VK7jSGZ4xo2s9rw"
                    />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1a1a1a]">Voxel Sentinel</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#d4af37]/25 text-[#554300] text-[10px] uppercase font-bold tracking-wider">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-[#4d4635]">
                      Autonomous verification engine observing live state sync.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#d4af37] text-[#554300] text-xs shadow-sm font-bold shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Ledger Sentry Active</span>
                </div>
              </div>
            </section>

            {/* Right Column: Glassmorphic Atelier Card (5 cols) */}
            <section className="lg:col-span-5 w-full flex flex-col items-center">
              <div className="w-full rounded-3xl bg-white border border-[#d4af37]/30 p-8 sm:p-10 shadow-xl space-y-6">
                {/* Card Header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] tracking-widest text-[#735c00] font-bold uppercase">
                      Atelier Registration
                    </span>
                    <span className="text-[11px] text-[#7f7663] font-mono">v2.4.0-sec</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">
                    Create AgentBucket Account
                  </h2>
                  <p className="text-xs text-[#4d4635]">
                    Start deploying agents, registering APIs, and earning stablecoins per call.
                  </p>
                </div>

                {/* Interactive Error Toast Banner */}
                {errorMessage && (
                  <div
                    className="flex items-start justify-between gap-2.5 p-3.5 rounded-xl bg-[#fde8e8] text-[#9b1c1c] border border-rose-200 shadow-sm text-xs"
                    role="alert"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-rose-700">Registration Attention Required</p>
                        <p className="leading-snug">{errorMessage}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setErrorMessage(null)}
                      className="p-1 rounded text-rose-700 hover:bg-rose-100 transition-colors"
                      type="button"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Role Selector Pill */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#1a1a1a]">Primary Intended Role</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRole("buyer")}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                        role === "buyer"
                          ? "bg-[#d4af37]/20 border-[#d4af37] text-[#554300] shadow-sm"
                          : "bg-[#f5f3f0] border-transparent text-[#4d4635] hover:bg-[#eae8e5]"
                      }`}
                    >
                      🤖 Buyer Agent
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("seller")}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                        role === "seller"
                          ? "bg-[#d4af37]/20 border-[#d4af37] text-[#554300] shadow-sm"
                          : "bg-[#f5f3f0] border-transparent text-[#4d4635] hover:bg-[#eae8e5]"
                      }`}
                    >
                      ⚡ Service Provider
                    </button>
                  </div>
                </div>

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  {/* Field 1: Name */}
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-[#1a1a1a]" htmlFor="nameInput">
                      Full Name or Organization Alias
                    </label>
                    <div className="relative">
                      <input
                        id="nameInput"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Vance"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f3f0] text-[#1a1a1a] outline-none transition-all placeholder:text-[#7f7663] border border-transparent focus:border-[#d4af37] focus:bg-white focus:shadow-[0_0_0_2px_rgba(212,175,55,0.3)] pr-10"
                      />
                      <UserIcon className="w-4 h-4 text-[#7f7663] absolute right-3.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Field 2: Email */}
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-[#1a1a1a]" htmlFor="emailInput">
                      Developer Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="emailInput"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f3f0] text-[#1a1a1a] outline-none transition-all placeholder:text-[#7f7663] border border-transparent focus:border-[#d4af37] focus:bg-white focus:shadow-[0_0_0_2px_rgba(212,175,55,0.3)] pr-10"
                      />
                      <Mail className="w-4 h-4 text-[#7f7663] absolute right-3.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Field 3: Password */}
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-[#1a1a1a]" htmlFor="passwordInput">
                      Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        id="passwordInput"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f3f0] text-[#1a1a1a] outline-none transition-all placeholder:text-[#7f7663] border border-transparent focus:border-[#d4af37] focus:bg-white focus:shadow-[0_0_0_2px_rgba(212,175,55,0.3)] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 p-1 rounded text-[#7f7663] hover:text-[#1a1a1a] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <div className="pt-2 space-y-2.5">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 rounded-xl bg-[#d4af37] text-[#554300] uppercase tracking-wider font-bold shadow-[0_4px_16px_rgba(212,175,55,0.35)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-[#554300]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor"></path>
                          </svg>
                          <span>Creating account...</span>
                        </span>
                      ) : (
                        <>
                          <span>Create AgentBucket Account</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Footer Switcher */}
                <div className="pt-1 text-center">
                  <p className="text-xs text-[#4d4635]">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="font-bold text-[#735c00] hover:text-[#d4af37] transition-colors inline-flex items-center gap-0.5"
                    >
                      Sign in
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </p>
                </div>

                {/* Trust Footer Tags */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-center">
                  <span className="px-2 py-0.5 rounded-md bg-[#efeeeb] text-[10px] text-[#4d4635] font-medium">
                    HTTP 402 Compliant
                  </span>
                  <span className="text-[#d0c5af]">•</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#efeeeb] text-[10px] text-[#4d4635] font-medium">
                    EIP-3009 Micro-settlements
                  </span>
                  <span className="text-[#d0c5af]">•</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#efeeeb] text-[10px] text-[#4d4635] font-medium">
                    Zero Custody
                  </span>
                </div>
              </div>

              {/* Security Microcopy */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-[#4d4635]">
                <Lock className="w-3.5 h-3.5 text-[#735c00]" />
                <span>End-to-End Cryptographic Session Attestation</span>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <footer className="w-full bg-[#f5f3f0] border-t border-[#d4af37]/15 py-3.5 mt-auto">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#4d4635]">
          <div className="flex items-center gap-2">
            <span className="uppercase font-medium">© 2025 AgentBucket Atelier</span>
            <span className="text-[#d0c5af]">•</span>
            <span className="text-[#735c00] font-semibold">Chain ID 84532</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#7f7663]">Security & Key Management</span>
            <span className="text-[11px] text-[#7f7663]">Atelier Protocol Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
