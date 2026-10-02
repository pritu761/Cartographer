"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { TopBar } from "@/components/TopBar";
import { LeftPanel } from "@/components/LeftPanel";
import { CenterCanvas } from "@/components/CenterCanvas";
import { RightInspector } from "@/components/RightInspector";
import type { CoverageReport, DependencyEdge, ParsedFile } from "@/parser/types";
import { classifyAllFiles } from "@/adapters";
import { groupFilesIntoFolders } from "@/graph/folders";

export default function HomePage() {
  const [targetPath, setTargetPath] = useState("fixtures/sample-app");
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [edges, setEdges] = useState<DependencyEdge[]>([]);
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
  const [metrics, setMetrics] = useState<Record<string, { fanIn: number; fanOut: number }>>({});
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [foldedFolderIds, setFoldedFolderIds] = useState<Set<string>>(new Set());

  const handleParse = useCallback(
    async (pathOverride?: string) => {
      const pathToUse = pathOverride !== undefined ? pathOverride : targetPath;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPath: pathToUse }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to parse target directory");
        }

        const data = json.data;
        setFiles(data.files);
        setEdges(data.edges);
        setCoverage(data.coverage);
        setMetrics(data.metrics);
        setFoldedFolderIds(new Set()); // Reset folder folding on new parse

        // Select the first file by default if none selected or previous selection no longer exists
        if (data.files.length > 0) {
          const currentExists = data.files.some((f: ParsedFile) => f.path === selectedFileId);
          if (!currentExists) {
            setSelectedFileId(data.files[0].path);
          }
        } else {
          setSelectedFileId(null);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [targetPath, selectedFileId]
  );

  // Automatically parse sample app on initial mount
  useEffect(() => {
    handleParse("fixtures/sample-app");
  }, [handleParse]);

  // Framework adapter classification: pure computation outside parser
  const classifications = useMemo(() => classifyAllFiles(files), [files]);

  // Folder grouping: pure calculation over files
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
          onSelectFile={setSelectedFileId}
        />
      </div>
    </div>
  );
}
