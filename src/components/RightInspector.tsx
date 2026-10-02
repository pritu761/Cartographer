"use client";

import { FileText, ArrowDownLeft, ArrowUpRight, AlertTriangle, ShieldCheck } from "lucide-react";
import type { DependencyEdge, ParsedFile, UnresolvedImport } from "@/parser/types";

interface RightInspectorProps {
  selectedFile: ParsedFile | null;
  edges: DependencyEdge[];
  unresolvedImports: UnresolvedImport[];
  onSelectFile: (filePath: string) => void;
}

export function RightInspector({
  selectedFile,
  edges,
  unresolvedImports,
  onSelectFile,
}: RightInspectorProps) {
  if (!selectedFile) {
    return (
      <aside className="flex h-full w-84 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6 items-center justify-center text-center shrink-0">
        <FileText size={28} className="text-[var(--text-muted)] mb-2" />
        <div className="font-mono text-xs font-semibold text-[var(--text-primary)]">
          No File Selected
        </div>
        <p className="font-mono text-[11px] text-[var(--text-muted)] mt-1 max-w-[200px]">
          Select any file from the sidebar list or graph to inspect its imports and dependents.
        </p>
      </aside>
    );
  }

  // Pure graph calculations: incoming (edges pointing to this file) and outgoing (edges from this file)
  const incoming = edges.filter((e) => e.to === selectedFile.path);
  const outgoing = edges.filter((e) => e.from === selectedFile.path);
  const fileUnresolved = unresolvedImports.filter((u) => u.file === selectedFile.path && !u.isExternal);
  const fileExternal = unresolvedImports.filter((u) => u.file === selectedFile.path && u.isExternal);

  return (
    <aside className="flex h-full w-84 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-panel)] shrink-0 overflow-y-auto">
      {/* File Header */}
      <div className="border-b border-[var(--border-subtle)] p-4 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            File Inspector
          </span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {(selectedFile.sizeBytes / 1024).toFixed(1)} KB
          </span>
        </div>
        <h2
          className="font-mono text-sm font-semibold text-[var(--text-primary)] break-all leading-tight"
          title={selectedFile.path}
        >
          {selectedFile.path}
        </h2>
      </div>

      {/* Fan Metrics Badges */}
      <div className="grid grid-cols-2 gap-2 p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)]">
        <div className="rounded border border-[var(--incoming-green-border)] bg-[var(--incoming-green-surface)] p-2">
          <div className="flex items-center gap-1 font-mono text-[10px] font-semibold text-[var(--incoming-green)]">
            <ArrowDownLeft size={12} />
            <span>FAN-IN</span>
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-[var(--incoming-green)]">
            {incoming.length}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">incoming dependents</div>
        </div>

        <div className="rounded border border-[var(--outgoing-amber-border)] bg-[var(--outgoing-amber-surface)] p-2">
          <div className="flex items-center gap-1 font-mono text-[10px] font-semibold text-[var(--outgoing-amber)]">
            <ArrowUpRight size={12} />
            <span>FAN-OUT</span>
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-[var(--outgoing-amber)]">
            {outgoing.length}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">outgoing imports</div>
        </div>
      </div>

      {/* Incoming Dependents (Flows INTO this file) */}
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--incoming-green)]">
            <ArrowDownLeft size={13} />
            <span>IMPORTED BY ({incoming.length})</span>
          </div>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            dependents
          </span>
        </div>

        {incoming.length === 0 ? (
          <div className="font-mono text-[11px] text-[var(--text-muted)] italic">
            No other files in this project import this file directly.
          </div>
        ) : (
          <div className="space-y-1 font-mono text-xs">
            {incoming.map((edge, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectFile(edge.from)}
                className="flex w-full items-center justify-between rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2 py-1.5 text-left hover:border-[var(--incoming-green)] transition-colors"
              >
                <span className="truncate text-[var(--text-primary)]" title={edge.from}>
                  {edge.from}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-1">
                  [{edge.kind}]
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Dependencies (Flows OUT of this file) */}
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--outgoing-amber)]">
            <ArrowUpRight size={13} />
            <span>IMPORTS ({outgoing.length})</span>
          </div>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            dependencies
          </span>
        </div>

        {outgoing.length === 0 ? (
          <div className="font-mono text-[11px] text-[var(--text-muted)] italic">
            This file does not import any other local files.
          </div>
        ) : (
          <div className="space-y-1 font-mono text-xs">
            {outgoing.map((edge, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectFile(edge.to)}
                className="flex w-full items-center justify-between rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2 py-1.5 text-left hover:border-[var(--outgoing-amber)] transition-colors"
              >
                <span className="truncate text-[var(--text-primary)]" title={edge.to}>
                  {edge.to}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-1">
                  [{edge.kind}]
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* External Packages imported by this file */}
      {fileExternal.length > 0 && (
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--text-secondary)] mb-2">
            <ShieldCheck size={13} />
            <span>EXTERNAL PACKAGES ({fileExternal.length})</span>
          </div>
          <div className="space-y-1 font-mono text-xs">
            {fileExternal.map((ext, idx) => (
              <div
                key={idx}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2 py-1 text-[var(--text-muted)] truncate"
              >
                {ext.specifier}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unresolved Imports for this file */}
      {fileUnresolved.length > 0 && (
        <div className="p-4 bg-red-500/5">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-red-500 mb-2">
            <AlertTriangle size={13} />
            <span>UNRESOLVED IMPORTS ({fileUnresolved.length})</span>
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            {fileUnresolved.map((u, idx) => (
              <div
                key={idx}
                className="rounded border border-red-500/30 bg-red-500/10 p-2 text-red-600 dark:text-red-400"
              >
                <div className="font-semibold truncate">Line {u.line}: &quot;{u.specifier}&quot;</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{u.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
