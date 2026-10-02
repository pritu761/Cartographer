"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { TopBar } from "@/components/TopBar";
import { LeftPanel } from "@/components/LeftPanel";
import { CenterCanvas } from "@/components/CenterCanvas";
import { RightInspector } from "@/components/RightInspector";
import { ChatPanel } from "@/components/ChatPanel";
import { AuditModal } from "@/components/AuditModal";
import type { CoverageReport, DependencyEdge, ParsedFile } from "@/parser/types";
import { classifyAllFiles } from "@/adapters";
import { groupFilesIntoFolders } from "@/graph/folders";
import type { StoredRepository } from "@/lib/supabase/client";

export default function HomePage() {
  const [targetPath, setTargetPath] = useState("fixtures/sample-app");
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [edges, setEdges] = useState<DependencyEdge[]>([]);
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
  const [metrics, setMetrics] = useState<Record<string, { fanIn: number; fanOut: number }>>({});
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [foldedFolderIds, setFoldedFolderIds] = useState<Set<string>>(new Set());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Organization state
  const [currentOrgId, setCurrentOrgId] = useState("org_demo_local");
  const [savedRepos, setSavedRepos] = useState<StoredRepository[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("cartograph_org");
    if (saved) {
      setCurrentOrgId(saved);
    }
  }, []);

  const handleOrgChange = useCallback((newOrg: string) => {
    setCurrentOrgId(newOrg);
    localStorage.setItem("cartograph_org", newOrg);
  }, []);

  // Fetch saved repositories for active organization
  const fetchOrgRepos = useCallback(async () => {
    try {
      const res = await fetch("/api/org/repositories", {
        headers: { "x-cartograph-org-id": currentOrgId },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.repositories)) {
        setSavedRepos(data.repositories);
      } else {
        setSavedRepos([]);
      }
    } catch {
      setSavedRepos([]);
    }
  }, [currentOrgId]);

  useEffect(() => {
    fetchOrgRepos();
  }, [fetchOrgRepos]);

  const handleParse = useCallback(
    async (pathOverride?: string) => {
      const pathToUse = pathOverride !== undefined ? pathOverride : targetPath;
      setIsLoading(true);
      setErrorMessage(null);
      setProgressMessage("Initializing analysis...");

      try {
        const res = await fetch("/api/parse/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cartograph-org-id": currentOrgId,
          },
          body: JSON.stringify({ input: pathToUse }),
        });

        if (!res.ok) {
          throw new Error(`Analysis request failed: ${res.statusText}`);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("Unable to establish streaming response.");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const payload = JSON.parse(trimmed.slice(6));
                if (payload.type === "progress") {
                  setProgressMessage(payload.message);
                } else if (payload.type === "complete") {
                  const data = payload.data;
                  setFiles(data.files);
                  setEdges(data.edges);
                  setCoverage(data.coverage);
                  setMetrics(data.metrics);
                  setFoldedFolderIds(new Set());

                  if (data.files.length > 0) {
                    const currentExists = data.files.some(
                      (f: ParsedFile) => f.path === selectedFileId
                    );
                    if (!currentExists) {
                      setSelectedFileId(data.files[0].path);
                    }
                  } else {
                    setSelectedFileId(null);
                  }
                } else if (payload.type === "error") {
                  throw new Error(payload.error || "Analysis failed.");
                }
              } catch (parseErr) {
                if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                  throw parseErr;
                }
              }
            }
          }
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
        setProgressMessage(null);
      }
    },
    [targetPath, selectedFileId, currentOrgId]
  );

  // Automatically parse sample app on initial mount
  useEffect(() => {
    handleParse("fixtures/sample-app");
  }, [handleParse]);

  // Save current analysis to active organization
  const handleSaveAnalysis = useCallback(async () => {
    if (files.length === 0) return;

    const parts = targetPath.split("/");
    const repoName = parts[parts.length - 1] || targetPath;
    const owner = parts.length > 1 ? parts[0] : "local";

    const res = await fetch("/api/org/repositories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cartograph-org-id": currentOrgId,
      },
      body: JSON.stringify({
        repo: {
          url: targetPath,
          owner,
          name: repoName,
        },
        analysis: {
          filesCount: files.length,
          edgesCount: edges.length,
          summaryJson: {
            files,
            edges,
            coverage,
            metrics,
          },
        },
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to save analysis.");
    }

    await fetchOrgRepos();
  }, [files, edges, coverage, metrics, targetPath, currentOrgId, fetchOrgRepos]);

  // Select a previously saved repository
  const handleSelectSavedRepo = useCallback(
    (repo: StoredRepository & { latestAnalysis?: { summary_json: Record<string, unknown> } }) => {
      if (repo.latestAnalysis?.summary_json) {
        const snap = repo.latestAnalysis.summary_json as {
          files?: ParsedFile[];
          edges?: DependencyEdge[];
          coverage?: CoverageReport;
          metrics?: Record<string, { fanIn: number; fanOut: number }>;
        };

        setTargetPath(repo.url);
        if (snap.files) setFiles(snap.files);
        if (snap.edges) setEdges(snap.edges);
        if (snap.coverage) setCoverage(snap.coverage);
        if (snap.metrics) setMetrics(snap.metrics);
        if (snap.files && snap.files.length > 0) setSelectedFileId(snap.files[0].path);
      } else {
        setTargetPath(repo.url);
        handleParse(repo.url);
      }
    },
    [handleParse]
  );

  // Framework adapter classification
  const classifications = useMemo(() => classifyAllFiles(files), [files]);

  // Folder grouping
  const folders = useMemo(() => groupFilesIntoFolders(files), [files]);

  const toggleFoldFolder = useCallback((folderId: string) => {
    setFoldedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const foldAllFolders = useCallback(() => {
    const all = new Set<string>();
    folders.forEach((_, id) => all.add(id));
    setFoldedFolderIds(all);
  }, [folders]);

  const unfoldAllFolders = useCallback(() => {
    setFoldedFolderIds(new Set());
  }, []);

  const selectedFile = files.find((f) => f.path === selectedFileId) || null;
  const selectedClassification = selectedFileId
    ? classifications.get(selectedFileId) || null
    : null;
  const unresolvedList = coverage ? coverage.unresolvedImports : [];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-canvas)]">
      {/* Top Application Bar */}
      <TopBar
        targetPath={targetPath}
        onTargetPathChange={setTargetPath}
        onParse={() => handleParse()}
        isLoading={isLoading}
        progressMessage={progressMessage}
        currentOrgId={currentOrgId}
        onOrgChange={handleOrgChange}
        canSave={files.length > 0}
        onSaveAnalysis={handleSaveAnalysis}
        savedRepos={savedRepos}
        onSelectSavedRepo={handleSelectSavedRepo}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onOpenAudit={() => setIsAuditOpen(true)}
      />

      {/* Error alert banner if any */}
      {errorMessage && (
        <div className="flex items-center justify-between border-b border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-500">
          <span>Error: {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Fixed 3-Panel Workspace */}
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel
          files={files}
          metrics={metrics}
          classifications={classifications}
          selectedFileId={selectedFileId}
          onSelectFile={setSelectedFileId}
          coverage={coverage}
          folders={folders}
          foldedFolderIds={foldedFolderIds}
          onToggleFold={toggleFoldFolder}
        />

        <CenterCanvas
          files={files}
          edges={edges}
          metrics={metrics}
          classifications={classifications}
          selectedFileId={selectedFileId}
          onSelectFile={setSelectedFileId}
          onParseSample={() => {
            setTargetPath("fixtures/sample-app");
            handleParse("fixtures/sample-app");
          }}
          isLoading={isLoading}
          folders={folders}
          foldedFolderIds={foldedFolderIds}
          onToggleFold={toggleFoldFolder}
          onFoldAll={foldAllFolders}
          onUnfoldAll={unfoldAllFolders}
        />

        <RightInspector
          selectedFile={selectedFile}
          edges={edges}
          unresolvedImports={unresolvedList}
          classification={selectedClassification}
          allFilePaths={files.map((f) => f.path)}
          repoUrl={targetPath}
          currentOrgId={currentOrgId}
          onSelectFile={setSelectedFileId}
        />
      </div>

      {/* Grounded Repository Chat Agent Drawer */}
      <ChatPanel
        files={files}
        edges={edges}
        selectedFileId={selectedFileId}
        onSelectFile={setSelectedFileId}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* Ship Criteria Quality Gate Modal */}
      <AuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />
    </div>
  );
}
