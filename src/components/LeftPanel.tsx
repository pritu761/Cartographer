"use client";

import { useState } from "react";
import { FileCode, Search, ShieldAlert, Layers } from "lucide-react";
import type { CoverageReport, ParsedFile } from "@/parser/types";

interface LeftPanelProps {
  files: ParsedFile[];
  metrics: Record<string, { fanIn: number; fanOut: number }>;
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  coverage: CoverageReport | null;
}

export function LeftPanel({
  files,
  metrics,
  selectedFileId,
  onSelectFile,
  coverage,
}: LeftPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSkippedModal, setShowSkippedModal] = useState(false);

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="flex h-full w-80 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] shrink-0 overflow-hidden">
      {/* File List Header */}
      <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] p-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--text-primary)]">
            <Layers size={14} className="text-[var(--accent-blue)]" />
            <span>FILES ({files.length})</span>
          </div>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            {filteredFiles.length} visible
          </span>
        </div>

        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] py-1 pl-7 pr-2 font-mono text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-blue)]"
          />
        </div>
      </div>

      {/* File List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {filteredFiles.length === 0 ? (
          <div className="p-4 text-center font-mono text-xs text-[var(--text-muted)]">
            {files.length === 0 ? "No files parsed yet." : "No matching files."}
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isSelected = file.path === selectedFileId;
            const fileMetrics = metrics[file.path] || { fanIn: 0, fanOut: 0 };

            return (
              <button
                key={file.path}
                type="button"
                onClick={() => onSelectFile(file.path)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors ${
                  isSelected
                    ? "bg-[var(--accent-blue-surface)] border-l-2 border-l-[var(--accent-blue)]"
                    : "hover:bg-[var(--bg-panel-subtle)]"
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                  <FileCode
                    size={13}
                    className={
                      isSelected
                        ? "text-[var(--accent-blue)]"
                        : "text-[var(--text-muted)]"
                    }
                  />
                  <span
                    className={`font-mono text-xs truncate ${
                      isSelected
                        ? "font-medium text-[var(--accent-blue)]"
                        : "text-[var(--text-primary)]"
                    }`}
                    title={file.path}
                  >
                    {file.path}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                  <span
                    title="Fan-in (incoming dependents)"
                    className="rounded bg-[var(--incoming-green-surface)] border border-[var(--incoming-green-border)] px-1 text-[var(--incoming-green)]"
                  >
                    +{fileMetrics.fanIn}
                  </span>
                  <span
                    title="Fan-out (outgoing dependencies)"
                    className="rounded bg-[var(--outgoing-amber-surface)] border border-[var(--outgoing-amber-border)] px-1 text-[var(--outgoing-amber)]"
                  >
                    -{fileMetrics.fanOut}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Coverage Report Summary */}
      {coverage && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] p-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-[var(--text-secondary)]">
              COVERAGE REPORT
            </span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {coverage.parsedFilesCount} / {coverage.totalEncounteredFiles} files
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
            <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-1.5">
              <div className="text-[10px] text-[var(--text-muted)]">Parsed Files</div>
              <div className="font-semibold text-[var(--text-primary)]">
                {coverage.parsedFilesCount}
              </div>
            </div>

            <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-1.5">
              <div className="text-[10px] text-[var(--text-muted)]">Internal Edges</div>
              <div className="font-semibold text-[var(--text-primary)]">
                {coverage.internalEdgesCount}
              </div>
            </div>

            <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-1.5">
              <div className="text-[10px] text-[var(--text-muted)]">External Pkgs</div>
              <div className="font-semibold text-[var(--text-secondary)]">
                {coverage.externalDependenciesCount}
              </div>
            </div>

            <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-1.5">
              <div className="text-[10px] text-[var(--text-muted)]">Skipped Files</div>
              <button
                type="button"
                onClick={() => setShowSkippedModal(!showSkippedModal)}
                className="font-semibold text-[var(--accent-blue)] underline cursor-pointer"
              >
                {coverage.skippedFilesCount} view
              </button>
            </div>
          </div>

          {coverage.unresolvedImportsCount > 0 && (
            <div className="mt-2 flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 p-1.5 text-red-500 font-mono text-[11px]">
              <ShieldAlert size={14} />
              <span>{coverage.unresolvedImportsCount} unresolved imports!</span>
            </div>
          )}

          {showSkippedModal && (
            <div className="mt-2 max-h-36 overflow-y-auto rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2 font-mono text-[10px]">
              <div className="font-semibold text-[var(--text-secondary)] mb-1">
                Skipped Files Details:
              </div>
              {coverage.skippedFiles.length === 0 ? (
                <div className="text-[var(--text-muted)]">None</div>
              ) : (
                coverage.skippedFiles.map((s, idx) => (
                  <div key={idx} className="truncate border-b border-[var(--border-subtle)] py-0.5">
                    <span className="text-[var(--text-muted)]">[{s.reason}]</span> {s.path}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
