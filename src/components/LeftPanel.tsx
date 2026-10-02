"use client";

import { useState } from "react";
import {
  FileCode,
  Search,
  ShieldAlert,
  Layers,
  Folder,
  FolderClosed,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { CoverageReport, ParsedFile } from "@/parser/types";
import type { FileClassification } from "@/adapters/types";
import { KIND_COLOR_STYLES } from "@/adapters";
import type { FolderGroup } from "@/graph/folders";

interface LeftPanelProps {
  files: ParsedFile[];
  metrics: Record<string, { fanIn: number; fanOut: number }>;
  classifications: Map<string, FileClassification>;
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  coverage: CoverageReport | null;
  folders: Map<string, FolderGroup>;
  foldedFolderIds: Set<string>;
  onToggleFold: (folderId: string) => void;
}

export function LeftPanel({
  files,
  metrics,
  classifications,
  selectedFileId,
  onSelectFile,
  coverage,
  folders,
  foldedFolderIds,
  onToggleFold,
}: LeftPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"files" | "folders">("files");
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
            <span>EXPLORER</span>
          </div>

          <div className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setViewMode("files")}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                viewMode === "files"
                  ? "bg-[var(--bg-panel)] font-medium text-[var(--accent-blue)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Files ({files.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("folders")}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                viewMode === "folders"
                  ? "bg-[var(--bg-panel)] font-medium text-[var(--accent-blue)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Folders ({folders.size})
            </button>
          </div>
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
            placeholder="Filter codebase..."
            className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] py-1 pl-7 pr-2 font-mono text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-blue)]"
          />
        </div>
      </div>

      {/* Explorer Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {viewMode === "folders" ? (
          /* Folders Hierarchy View */
          <div className="p-2 space-y-1">
            {Array.from(folders.values()).map((folder) => {
              const isFolded = foldedFolderIds.has(folder.id);
              return (
                <div
                  key={folder.id}
                  className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] p-2 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <button
                        type="button"
                        onClick={() => onToggleFold(folder.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--accent-blue)]"
                        title={isFolded ? "Unfold folder" : "Fold folder"}
                      >
                        {isFolded ? (
                          <ChevronRight size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </button>
                      {isFolded ? (
                        <FolderClosed size={14} className="text-[var(--outgoing-amber)]" />
                      ) : (
                        <Folder size={14} className="text-[var(--accent-blue)]" />
                      )}
                      <span className="font-semibold text-[var(--text-primary)] truncate">
                        {folder.path}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFold(folder.id)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                        isFolded
                          ? "bg-[var(--outgoing-amber-surface)] border-[var(--outgoing-amber-border)] text-[var(--outgoing-amber)]"
                          : "bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {isFolded ? "Folded" : "Unfolded"} ({folder.files.length})
                    </button>
                  </div>

                  {!isFolded && (
                    <div className="mt-1.5 pl-4 border-l border-[var(--border-subtle)] space-y-1">
                      {folder.files.map((filePath) => {
                        const isSelected = filePath === selectedFileId;
                        const fileMetric = metrics[filePath] || { fanIn: 0, fanOut: 0 };
                        const cls = classifications.get(filePath);
                        const kindStyle = cls
                          ? KIND_COLOR_STYLES[cls.kind]
                          : KIND_COLOR_STYLES.generic;

                        return (
                          <button
                            key={filePath}
                            type="button"
                            onClick={() => onSelectFile(filePath)}
                            className={`flex w-full items-center justify-between rounded px-1.5 py-1 text-left ${
                              isSelected
                                ? "bg-[var(--accent-blue-surface)] text-[var(--accent-blue)] font-medium"
                                : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
                            }`}
                          >
                            <span className="truncate" title={filePath}>
                              {filePath.split("/").pop()}
                            </span>
                            <div className="flex items-center gap-1 shrink-0 text-[9px]">
                              <span
                                className={`rounded px-1 border ${kindStyle.bg} ${kindStyle.text} ${kindStyle.border}`}
                              >
                                {kindStyle.label}
                              </span>
                              <span className="text-[var(--incoming-green)]">+{fileMetric.fanIn}</span>
                              <span className="text-[var(--outgoing-amber)]">-{fileMetric.fanOut}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat Files List View */
          filteredFiles.map((file) => {
            const isSelected = file.path === selectedFileId;
            const fileMetrics = metrics[file.path] || { fanIn: 0, fanOut: 0 };
            const cls = classifications.get(file.path);
            const kindStyle = cls
              ? KIND_COLOR_STYLES[cls.kind]
              : KIND_COLOR_STYLES.generic;

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

                <div className="flex items-center gap-1 shrink-0 font-mono text-[9px]">
                  <span
                    className={`rounded px-1 border ${kindStyle.bg} ${kindStyle.text} ${kindStyle.border}`}
                  >
                    {kindStyle.label}
                  </span>
                  <span
                    title="Fan-in"
                    className="rounded bg-[var(--incoming-green-surface)] border border-[var(--incoming-green-border)] px-1 text-[var(--incoming-green)]"
                  >
                    +{fileMetrics.fanIn}
                  </span>
                  <span
                    title="Fan-out"
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
