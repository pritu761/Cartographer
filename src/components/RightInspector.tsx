"use client";

import {
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  ShieldCheck,
  Flame,
  GitCommitHorizontal,
} from "lucide-react";
import type { DependencyEdge, ParsedFile, UnresolvedImport } from "@/parser/types";
import { calculateBlastRadius, calculateDependencyChain } from "@/graph/blast-radius";
import type { FileClassification } from "@/adapters/types";
import { KIND_COLOR_STYLES } from "@/adapters";

interface RightInspectorProps {
  selectedFile: ParsedFile | null;
  edges: DependencyEdge[];
  unresolvedImports: UnresolvedImport[];
  classification: FileClassification | null;
  onSelectFile: (filePath: string) => void;
}

export function RightInspector({
  selectedFile,
  edges,
  unresolvedImports,
  classification,
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
          Select any file from the sidebar list or graph to inspect its blast radius and dependencies.
        </p>
      </aside>
    );
  }

  // Pure arithmetic calculations over the edge list
  const blastRadius = calculateBlastRadius(selectedFile.path, edges);
  const depChain = calculateDependencyChain(selectedFile.path, edges);

  const incoming = edges.filter((e) => e.to === selectedFile.path);
  const outgoing = edges.filter((e) => e.from === selectedFile.path);
  const fileUnresolved = unresolvedImports.filter(
    (u) => u.file === selectedFile.path && !u.isExternal
  );
  const fileExternal = unresolvedImports.filter(
    (u) => u.file === selectedFile.path && u.isExternal
  );

  const kindStyle = classification
    ? KIND_COLOR_STYLES[classification.kind]
    : KIND_COLOR_STYLES.generic;

  return (
    <aside className="flex h-full w-84 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-panel)] shrink-0 overflow-y-auto">
      {/* File Header */}
      <div className="border-b border-[var(--border-subtle)] p-4 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold border ${kindStyle.bg} ${kindStyle.text} ${kindStyle.border}`}
          >
            {kindStyle.label}
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
        {classification?.reason && (
          <div className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
            {classification.reason}
          </div>
        )}
      </div>

      {/* Fan Metrics Badges */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)]">
        <div className="rounded border border-[var(--incoming-green-border)] bg-[var(--incoming-green-surface)] p-2">
          <div className="flex items-center gap-1 font-mono text-[10px] font-semibold text-[var(--incoming-green)]">
            <ArrowDownLeft size={12} />
            <span>FAN-IN</span>
          </div>
          <div className="mt-0.5 font-mono text-lg font-bold text-[var(--incoming-green)]">
            {incoming.length}
          </div>
          <div className="text-[9px] text-[var(--text-muted)]">direct dependents</div>
        </div>

        <div className="rounded border border-[var(--outgoing-amber-border)] bg-[var(--outgoing-amber-surface)] p-2">
          <div className="flex items-center gap-1 font-mono text-[10px] font-semibold text-[var(--outgoing-amber)]">
            <ArrowUpRight size={12} />
            <span>FAN-OUT</span>
          </div>
          <div className="mt-0.5 font-mono text-lg font-bold text-[var(--outgoing-amber)]">
            {outgoing.length}
          </div>
          <div className="text-[9px] text-[var(--text-muted)]">direct imports</div>
        </div>
      </div>

      {/* Blast Radius Section (Downstream: what breaks if this changes) */}
      <div className="p-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-rose-500">
            <Flame size={13} />
            <span>BLAST RADIUS ({blastRadius.transitive.length})</span>
          </div>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            what breaks
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 mb-2 font-mono text-center text-[10px]">
          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] p-1">
            <div className="text-[var(--text-muted)]">1-hop</div>
            <div className="font-semibold text-[var(--text-primary)]">
              {blastRadius.level1.length}
            </div>
          </div>
          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] p-1">
            <div className="text-[var(--text-muted)]">2-hops</div>
            <div className="font-semibold text-rose-500">
              {blastRadius.level2.length}
            </div>
          </div>
          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] p-1">
            <div className="text-[var(--text-muted)]">Total</div>
            <div className="font-semibold text-rose-600">
              {blastRadius.transitive.length}
            </div>
          </div>
        </div>

        {blastRadius.transitive.length === 0 ? (
          <div className="font-mono text-[11px] text-[var(--text-muted)] italic">
            Zero downstream files break if this changes.
          </div>
        ) : (
          <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto">
            {blastRadius.transitive.map((file) => {
              const dist = blastRadius.distances[file] || 1;
              return (
                <button
                  key={file}
                  type="button"
                  onClick={() => onSelectFile(file)}
                  className="flex w-full items-center justify-between rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2 py-1 text-left hover:border-rose-500 transition-colors"
                >
                  <span className="truncate text-[var(--text-primary)]" title={file}>
                    {file}
                  </span>
                  <span
                    className={`ml-1 shrink-0 rounded px-1 text-[9px] font-semibold ${
                      dist === 1
                        ? "bg-rose-500/10 text-rose-500"
                        : "bg-[var(--bg-panel)] text-[var(--text-muted)]"
                    }`}
                  >
                    +{dist} hop{dist > 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Dependency Chain Section (Upstream: what this depends on) */}
      <div className="p-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--accent-blue)]">
            <GitCommitHorizontal size={13} />
            <span>DEPENDENCY CHAIN ({depChain.transitive.length})</span>
          </div>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            upstream
          </span>
        </div>

        {depChain.transitive.length === 0 ? (
          <div className="font-mono text-[11px] text-[var(--text-muted)] italic">
            No local dependencies. This file is a leaf.
          </div>
        ) : (
          <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto">
            {depChain.transitive.map((file) => {
              const dist = depChain.distances[file] || 1;
              return (
                <button
                  key={file}
                  type="button"
                  onClick={() => onSelectFile(file)}
                  className="flex w-full items-center justify-between rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2 py-1 text-left hover:border-[var(--accent-blue)] transition-colors"
                >
                  <span className="truncate text-[var(--text-primary)]" title={file}>
                    {file}
                  </span>
                  <span className="ml-1 shrink-0 rounded bg-[var(--accent-blue-surface)] px-1 text-[9px] text-[var(--accent-blue)]">
                    -{dist} hop{dist > 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* External Packages imported by this file */}
      {fileExternal.length > 0 && (
        <div className="p-3 border-b border-[var(--border-subtle)]">
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
        <div className="p-3 bg-red-500/5">
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
