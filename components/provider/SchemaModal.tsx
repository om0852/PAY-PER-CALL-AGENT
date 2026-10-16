"use client";

import React, { useState } from "react";
import { X, Copy, Check, Code } from "lucide-react";

interface SchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  schema: Record<string, unknown> | null;
}

export default function SchemaModal({
  isOpen,
  onClose,
  serviceName,
  schema,
}: SchemaModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const schemaJson = JSON.stringify(schema || {}, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#fbf9f6] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-[#d4af37]/30 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d0c5af]/40 bg-[#efeeeb]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center text-[#735c00]">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1b1c1a]">
                JSON Schema Inspector
              </h3>
              <p className="text-[11px] text-[#4d4635] font-mono">
                {serviceName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-[#eae8e5] text-xs font-semibold text-[#1b1c1a] rounded-lg transition-colors border border-[#d0c5af]/50"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#5b5e66]" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[#eae8e5] text-[#5b5e66] hover:text-[#1b1c1a] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Code Viewer */}
        <div className="p-6 overflow-y-auto bg-[#1b1c1a] text-emerald-400 font-mono text-xs leading-relaxed">
          <pre className="whitespace-pre-wrap">{schemaJson}</pre>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#d0c5af]/40 bg-[#f5f3f0] flex items-center justify-between text-[11px] text-[#5b5e66]">
          <span>Strict Ajv validation enforced for automated escrow settlement</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#d4af37] text-[#554300] font-bold rounded-lg hover:brightness-105 transition-all text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
