"use client";

import { FolderCode, Play, Loader2 } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface TopBarProps {
  targetPath: string;
  onTargetPathChange: (path: string) => void;
  onParse: () => void;
  isLoading: boolean;
}

export function TopBar({
  targetPath,
  onTargetPathChange,
  onParse,
  isLoading,
}: TopBarProps) {
  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FolderCode className="text-[var(--accent-blue)]" size={18} />
          <span className="font-mono text-sm font-semibold tracking-wider text-[var(--text-primary)]">
            CARTOGRAPH
          </span>
          <span className="rounded bg-[var(--bg-panel-subtle)] border border-[var(--border-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
            phase-01
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[var(--border-subtle)]" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onParse();
          }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2 py-1 focus-within:border-[var(--accent-blue)] focus-within:ring-1 focus-within:ring-[var(--accent-blue)]">
            <span className="font-mono text-xs text-[var(--text-muted)] mr-1.5">
              path:
            </span>
            <input
              type="text"
              value={targetPath}
              onChange={(e) => onTargetPathChange(e.target.value)}
              placeholder="e.g. fixtures/sample-app or ."
              className="w-64 bg-transparent font-mono text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onTargetPathChange("fixtures/sample-app")}
              className="rounded px-2 py-1 text-[11px] font-mono text-[var(--text-muted)] hover:bg-[var(--bg-panel-subtle)] hover:text-[var(--text-primary)]"
            >
              sample
            </button>
            <button
              type="button"
              onClick={() => onTargetPathChange(".")}
              className="rounded px-2 py-1 text-[11px] font-mono text-[var(--text-muted)] hover:bg-[var(--bg-panel-subtle)] hover:text-[var(--text-primary)]"
            >
              root
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded bg-[var(--accent-blue)] px-3 py-1 font-mono text-xs font-medium text-white shadow-xs hover:opacity-95 disabled:opacity-50 transition-opacity"
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Parsing...</span>
              </>
            ) : (
              <>
                <Play size={13} />
                <span>Parse Codebase</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
