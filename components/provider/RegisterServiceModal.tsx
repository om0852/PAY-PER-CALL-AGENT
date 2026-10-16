"use client";

import React, { useState } from "react";
import { X, Plus, AlertCircle, CheckCircle } from "lucide-react";

interface RegisterServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newService: any) => void;
  defaultPayTo?: string;
}

export default function RegisterServiceModal({
  isOpen,
  onClose,
  onSuccess,
  defaultPayTo = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
}: RegisterServiceModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("data");
  const [endpoint, setEndpoint] = useState("");
  const [priceUsdc, setPriceUsdc] = useState("0.0200");
  const [payTo, setPayTo] = useState(defaultPayTo);
  const [schemaText, setSchemaText] = useState(
    JSON.stringify(
      {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { type: "object" },
          timestamp: { type: "string" },
        },
        required: ["success", "data"],
      },
      null,
      2
    )
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      let parsedSchema: Record<string, unknown>;
      try {
        parsedSchema = JSON.parse(schemaText);
      } catch {
        setErrorMessage("Invalid JSON in schema field. Please verify JSON format.");
        setIsLoading(false);
        return;
      }

      const priceAtomic = Math.round(parseFloat(priceUsdc) * 1_000_000);
      if (isNaN(priceAtomic) || priceAtomic <= 0) {
        setErrorMessage("Please enter a valid positive price in USDC.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/registry/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          endpoint: endpoint.trim(),
          price: priceAtomic,
          asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          network: "base-sepolia",
          payTo: payTo.trim().toLowerCase(),
          schema: parsedSchema,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to register service.");
        setIsLoading(false);
        return;
      }

      onSuccess(data.service);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to connect to API.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#fbf9f6] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-[#d4af37]/30 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d0c5af]/40 bg-[#efeeeb]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d4af37] text-[#554300] flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1b1c1a]">
                Register New Agent Service
              </h3>
              <p className="text-[11px] text-[#4d4635]">
                List an HTTP 402 micro-payment endpoint in the AgentBucket marketplace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#eae8e5] text-[#5b5e66] hover:text-[#1b1c1a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="font-semibold text-[#1b1c1a] uppercase text-[10px] tracking-wider block mb-1">
              Service Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Solana Whale Alert Feed"
              className="w-full bg-[#f5f3f0] border border-[#d0c5af]/60 rounded-lg px-3 py-2 text-[#1b1c1a] focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#1b1c1a] uppercase text-[10px] tracking-wider block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#f5f3f0] border border-[#d0c5af]/60 rounded-lg px-3 py-2 text-[#1b1c1a] focus:outline-none focus:border-[#d4af37]"
              >
                <option value="data">Data Feed</option>
                <option value="scraping">Web Scraping</option>
                <option value="inference">AI Inference / Reasoning</option>
                <option value="fx-rates">FX &amp; Market Rates</option>
                <option value="summarization">NLP / Summarization</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#1b1c1a] uppercase text-[10px] tracking-wider block mb-1">
                Price per Call (USDC)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.0001"
                required
                value={priceUsdc}
                onChange={(e) => setPriceUsdc(e.target.value)}
                placeholder="0.0200"
                className="w-full bg-[#f5f3f0] border border-[#d0c5af]/60 rounded-lg px-3 py-2 text-[#1b1c1a] font-mono focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#1b1c1a] uppercase text-[10px] tracking-wider block mb-1">
              Endpoint URL (HTTP 402 challenge responder)
            </label>
            <input
              type="url"
              required
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://localhost:3000/api/sellers/whale-feed"
              className="w-full bg-[#f5f3f0] border border-[#d0c5af]/60 rounded-lg px-3 py-2 text-[#1b1c1a] font-mono text-[11px] focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#1b1c1a] uppercase text-[10px] tracking-wider block mb-1">
              Payout Wallet (Receives USDC settlement)
            </label>
            <input
              type="text"
              required
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
              className="w-full bg-[#f5f3f0] border border-[#d0c5af]/60 rounded-lg px-3 py-2 text-[#1b1c1a] font-mono text-[11px] focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#1b1c1a] uppercase text-[10px] tracking-wider block mb-1">
              Strict JSON Output Schema (Ajv validated)
            </label>
            <textarea
              rows={4}
              required
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              className="w-full bg-[#1b1c1a] text-emerald-400 border border-[#d0c5af]/60 rounded-lg p-2 font-mono text-[11px] focus:outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#efeeeb] text-[#5b5e66] hover:bg-[#eae8e5] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg bg-[#d4af37] text-[#554300] font-bold shadow-md hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {isLoading ? (
                <span>Registering Endpoint...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Register Service</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
