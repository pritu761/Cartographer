"use client";

import { useState, useEffect } from "react";
import { Building2, Save, Check } from "lucide-react";
import type { StoredRepository } from "@/lib/supabase/client";

interface OrgSelectorProps {
  currentOrgId: string;
  onOrgChange: (newOrgId: string) => void;
  canSave: boolean;
  onSaveAnalysis: () => Promise<void>;
  savedRepos: StoredRepository[];
  onSelectSavedRepo: (repo: StoredRepository) => void;
}

export function OrgSelector({
  currentOrgId,
  onOrgChange,
  canSave,
  onSaveAnalysis,
  savedRepos,
  onSelectSavedRepo,
}: OrgSelectorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  useEffect(() => {
    if (savedSuccess) {
      const timer = setTimeout(() => setSavedSuccess(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [savedSuccess]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSaveAnalysis();
      setSavedSuccess(true);
    } catch {
      // Error handled by caller
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      {/* Organization Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowOrgDropdown(!showOrgDropdown)}
          className="flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors cursor-pointer"
        >
          <Building2 size={13} className="text-[var(--accent-blue)]" />
          <span className="font-semibold text-[11px]">{currentOrgId}</span>
        </button>

        {showOrgDropdown && (
          <div className="absolute left-0 mt-1 w-56 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2 shadow-lg z-50">
            <div className="text-[10px] text-[var(--text-muted)] font-semibold mb-1 uppercase tracking-wider">
              Switch Organization
            </div>
            <div className="space-y-1">
              {["org_demo_local", "org_acme_corp", "org_frontend_team"].map((org) => (
                <button
                  key={org}
                  type="button"
                  onClick={() => {
                    onOrgChange(org);
                    setShowOrgDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] ${
                    currentOrgId === org
                      ? "bg-[var(--accent-blue-surface)] text-[var(--accent-blue)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel-subtle)]"
                  }`}
                >
                  <span>{org}</span>
                  {currentOrgId === org && <Check size={12} />}
                </button>
              ))}
            </div>

            {savedRepos.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-[10px] text-[var(--text-muted)] font-semibold mb-1 uppercase tracking-wider">
                  Saved In This Org ({savedRepos.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {savedRepos.map((repo) => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => {
                        onSelectSavedRepo(repo);
                        setShowOrgDropdown(false);
                      }}
                      className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-panel-subtle)] truncate"
                    >
                      <span className="truncate">{repo.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Analysis Button */}
      {canSave && (
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
            savedSuccess
              ? "border-[var(--incoming-green-border)] bg-[var(--incoming-green-surface)] text-[var(--incoming-green)]"
              : "border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)]"
          }`}
          title="Save this analysis to active organization"
        >
          {savedSuccess ? (
            <>
              <Check size={12} />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save size={12} />
              <span>{isSaving ? "Saving..." : "Save to Org"}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
