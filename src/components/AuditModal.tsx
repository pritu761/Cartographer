"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  X,
  ShieldCheck,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { AuditCriterionResult } from "../../scripts/audit-ship-criteria";

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuditModal({ isOpen, onClose }: AuditModalProps) {
  const [results, setResults] = useState<AuditCriterionResult[]>([]);
  const [score, setScore] = useState<number>(100);
  const [allPassed, setAllPassed] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function fetchAudit() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/audit");
      const json = await res.json();
      if (json.success && json.data) {
        setResults(json.data.results);
        setScore(json.data.score);
        setAllPassed(json.data.allPassed);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded border border-[var(--border-strong)] bg-[var(--bg-panel)] shadow-2xl overflow-hidden font-mono flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-4 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--incoming-green)]" />
            <span className="text-xs font-bold text-[var(--text-primary)] tracking-wider">
              SHIP CRITERIA AUDIT & QUALITY GATE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAudit}
              disabled={isLoading}
              className="flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              {isLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              <span>Re-run Gate</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Quality Score Banner */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--incoming-green-surface)] p-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--incoming-green)]" />
            <span className="font-semibold text-[var(--incoming-green)]">
              {allPassed
                ? "All Mandatory Ship Criteria Verified"
                : "Ship Criteria Failures Detected"}
            </span>
          </div>
          <span className="rounded bg-[var(--bg-panel)] border border-[var(--incoming-green-border)] px-2 py-0.5 text-[11px] font-bold text-[var(--incoming-green)]">
            Score: {score.toFixed(1)}%
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-[var(--accent-blue)]">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span>Verifying ship criteria across repository and database...</span>
            </div>
          ) : (
            results.map((r) => (
              <div
                key={r.id}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                    {r.passed ? (
                      <CheckCircle2 size={14} className="text-[var(--incoming-green)]" />
                    ) : (
                      <XCircle size={14} className="text-red-500" />
                    )}
                    <span>{r.name}</span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-bold border ${
                      r.passed
                        ? "bg-[var(--incoming-green-surface)] text-[var(--incoming-green)] border-[var(--incoming-green-border)]"
                        : "bg-red-500/10 text-red-500 border-red-500/30"
                    }`}
                  >
                    {r.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] break-all pl-5">
                  {r.evidence}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-4 py-2 text-[11px] text-[var(--text-muted)] shrink-0">
          <span>Enforces strict criteria from docs/project-doc.md</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-[var(--accent-blue)] px-3 py-1 text-white hover:opacity-95 cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
