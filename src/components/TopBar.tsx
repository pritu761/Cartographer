"use client";

import { FolderCode, Play, Loader2, GitBranch } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { OrgSelector } from "./OrgSelector";
import type { StoredRepository } from "@/lib/supabase/client";

interface TopBarProps {
  targetPath: string;
  onTargetPathChange: (path: string) => void;
  onParse: () => void;
  isLoading: boolean;
  progressMessage: string | null;
  currentOrgId: string;
  onOrgChange: (orgId: string) => void;
  canSave: boolean;
  onSaveAnalysis: () => Promise<void>;
  savedRepos: StoredRepository[];
  onSelectSavedRepo: (repo: StoredRepository) => void;
}

export function TopBar({
  targetPath,
  onTargetPathChange,
  onParse,
  isLoading,
  progressMessage,
  currentOrgId,
  onOrgChange,
  canSave,
  onSaveAnalysis,
  savedRepos,
  onSelectSavedRepo,
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
            phase-04
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
          <div className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2.5 py-1 focus-within:border-[var(--accent-blue)] focus-within:ring-1 focus-within:ring-[var(--accent-blue)]">
            <GitBranch size={13} className="text-[var(--text-muted)] mr-1.5" />
            <input
              type="text"
              value={targetPath}
              onChange={(e) => onTargetPathChange(e.target.value)}
              placeholder="e.g. vercel/ms or fixtures/sample-app"
              className="w-72 bg-transparent font-mono text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => onTargetPathChange("fixtures/sample-app")}
              className="rounded px-1.5 py-0.5 hover:bg-[var(--bg-panel-subtle)] hover:text-[var(--text-primary)]"
            >
              sample
            </button>
            <button
              type="button"
              onClick={() => onTargetPathChange("vercel/ms")}
              className="rounded px-1.5 py-0.5 hover:bg-[var(--bg-panel-subtle)] hover:text-[var(--text-primary)]"
            >
              vercel/ms
            </button>
            <button
              type="button"
              onClick={() => onTargetPathChange(".")}
              className="rounded px-1.5 py-0.5 hover:bg-[var(--bg-panel-subtle)] hover:text-[var(--text-primary)]"
            >
              root
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded bg-[var(--accent-blue)] px-3 py-1 font-mono text-xs font-medium text-white shadow-xs hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Play size={13} />
                <span>Parse Codebase</span>
              </>
            )}
          </button>
        </form>

        {/* Live progress stream indicator */}
        {isLoading && progressMessage && (
          <div className="flex items-center gap-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--accent-blue)] max-w-xs truncate animate-pulse">
            <Loader2 size={12} className="animate-spin shrink-0" />
            <span className="truncate">{progressMessage}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <OrgSelector
          currentOrgId={currentOrgId}
          onOrgChange={onOrgChange}
          canSave={canSave}
          onSaveAnalysis={onSaveAnalysis}
          savedRepos={savedRepos}
          onSelectSavedRepo={onSelectSavedRepo}
        />
        <div className="h-4 w-[1px] bg-[var(--border-subtle)]" />
        <ThemeToggle />
      </div>
    </header>
  );
}
