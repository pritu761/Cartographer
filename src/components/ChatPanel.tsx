"use client";

import { useState } from "react";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Terminal,
} from "lucide-react";
import type { DependencyEdge, ParsedFile } from "@/parser/types";
import type { LookupStep } from "@/lib/agent/tools";
import type { GroundTruthVerificationResult } from "@/lib/ai/hallucination-checker";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  lookups?: LookupStep[];
  verification?: GroundTruthVerificationResult;
}

interface ChatPanelProps {
  files: ParsedFile[];
  edges: DependencyEdge[];
  selectedFileId: string | null;
  onSelectFile: (filePath: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({
  files,
  edges,
  selectedFileId,
  onSelectFile,
  isOpen,
  onClose,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLookups, setExpandedLookups] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  async function handleSend(queryToSend?: string) {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          files,
          edges,
          selectedFileId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Agent execution failed.");
      }

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: "assistant",
        content: json.data.answer,
        lookups: json.data.lookups,
        verification: json.data.verification,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      // Expand lookups by default for visibility
      setExpandedLookups((prev) => ({ ...prev, [assistantMsg.id]: true }));
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content: `Agent error: ${err instanceof Error ? err.message : String(err)}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleLookups(id: string) {
    setExpandedLookups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="absolute bottom-0 right-0 left-0 h-80 z-30 flex flex-col border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl overflow-hidden">
      {/* Panel Header */}
      <div className="flex h-10 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[var(--accent-blue)]" />
          <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
            REPOSITORY STRUCTURAL AGENT
          </span>
          <span className="rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] px-1.5 py-0.2 font-mono text-[9px] text-[var(--text-muted)]">
            grounded lookups
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMessages([])}
            className="font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-muted)]">
            <MessageSquare size={24} className="mb-2 text-[var(--text-muted)]" />
            <div className="font-semibold text-xs text-[var(--text-primary)]">
              Ask anything about the codebase structure
            </div>
            <p className="text-[11px] mt-1 max-w-sm">
              The agent performs verified graph arithmetic lookups before answering.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              <button
                type="button"
                onClick={() =>
                  handleSend(
                    selectedFileId
                      ? `What breaks if ${selectedFileId} changes?`
                      : "What breaks if src/utils/math.ts changes?"
                  )
                }
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent-blue)] transition-colors cursor-pointer"
              >
                What breaks if {selectedFileId || "src/utils/math.ts"} changes?
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSend(
                    selectedFileId
                      ? `What files depend on ${selectedFileId}?`
                      : "What files depend on src/utils/math.ts?"
                  )
                }
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent-blue)] transition-colors cursor-pointer"
              >
                What files depend on {selectedFileId || "src/utils/math.ts"}?
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              {msg.role === "user" ? (
                <div className="max-w-[80%] rounded bg-[var(--accent-blue)] px-3 py-1.5 text-white shadow-xs">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[90%] space-y-2">
                  {/* Visible Lookup Trace */}
                  {msg.lookups && msg.lookups.length > 0 && (
                    <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] p-2">
                      <button
                        type="button"
                        onClick={() => toggleLookups(msg.id)}
                        className="flex w-full items-center justify-between font-semibold text-[10px] text-[var(--text-secondary)] cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <Search size={11} className="text-[var(--accent-blue)]" />
                          <span>
                            LOOKUPS PERFORMED ({msg.lookups.length})
                          </span>
                        </div>
                        {expandedLookups[msg.id] ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                      </button>

                      {expandedLookups[msg.id] && (
                        <div className="mt-1.5 space-y-1 border-t border-[var(--border-subtle)] pt-1.5 text-[10px]">
                          {msg.lookups.map((step, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-1.5 text-[var(--text-muted)]"
                            >
                              <span className="font-bold text-[var(--accent-blue)] shrink-0">
                                {step.toolName}:
                              </span>
                              <span>{step.summary}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Final Synthesized Answer */}
                  <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2.5 shadow-xs leading-relaxed text-[var(--text-primary)]">
                    {msg.content}
                  </div>

                  {/* Clickable Verified File Chips */}
                  {msg.verification && msg.verification.verifiedFiles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      <span className="text-[var(--text-muted)]">Jump to file:</span>
                      {msg.verification.verifiedFiles.map((vf) => (
                        <button
                          key={vf}
                          type="button"
                          onClick={() => onSelectFile(vf)}
                          className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-1.5 py-0.5 text-[var(--accent-blue)] hover:bg-[var(--accent-blue-surface)] cursor-pointer"
                          title={`Select ${vf} on canvas`}
                        >
                          {vf}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Ground truth check pill */}
                  {msg.verification && (
                    <div className="flex items-center gap-1 text-[10px]">
                      {msg.verification.isValid ? (
                        <span
                          className="flex items-center gap-1 text-[var(--incoming-green)]"
                          title={msg.verification.message}
                        >
                          <CheckCircle2 size={11} />
                          <span>Verified: all named files exist on disk</span>
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-red-500 font-semibold"
                          title={msg.verification.message}
                        >
                          <AlertTriangle size={11} />
                          <span>Absent files flagged: {msg.verification.hallucinatedFiles.join(", ")}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-[var(--accent-blue)] font-mono text-xs">
            <Loader2 size={14} className="animate-spin" />
            <span>Looking up repository structure...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2.5 shrink-0"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask a question about dependencies or structure..."
          className="flex-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-3 py-1.5 font-mono text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-blue)]"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="flex items-center gap-1 rounded bg-[var(--accent-blue)] px-3 py-1.5 font-mono text-xs font-medium text-white shadow-xs hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
        >
          <Send size={12} />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}
