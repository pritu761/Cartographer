"use client";

import { useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import {
  Network,
  Play,
  FolderClosed,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { DependencyEdge, ParsedFile } from "@/parser/types";
import type { FileClassification } from "@/adapters/types";
import { KIND_COLOR_STYLES } from "@/adapters";
import {
  type FolderGroup,
  rollUpEdges,
  getVisualNodeIdForFile,
} from "@/graph/folders";
import { calculateBlastRadius, calculateDependencyChain } from "@/graph/blast-radius";

interface CenterCanvasProps {
  files: ParsedFile[];
  edges: DependencyEdge[];
  metrics: Record<string, { fanIn: number; fanOut: number }>;
  classifications: Map<string, FileClassification>;
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onParseSample: () => void;
  isLoading: boolean;
  folders: Map<string, FolderGroup>;
  foldedFolderIds: Set<string>;
  onToggleFold: (folderId: string) => void;
  onFoldAll: () => void;
  onUnfoldAll: () => void;
}

interface CustomFileNodeData {
  label: string;
  fanIn: number;
  fanOut: number;
  classification?: FileClassification;
  isSelected: boolean;
  isInBlastRadius: boolean;
  isInDepChain: boolean;
  [key: string]: unknown;
}

interface CustomFolderNodeData {
  folderId: string;
  folderPath: string;
  filesCount: number;
  onToggleFold: (id: string) => void;
  [key: string]: unknown;
}

// Custom file node
function FileNodeComponent({ data }: NodeProps<Node<CustomFileNodeData>>) {
  const { label, fanIn, fanOut, classification, isSelected, isInBlastRadius, isInDepChain } = data;
  const kindStyle = classification ? KIND_COLOR_STYLES[classification.kind] : KIND_COLOR_STYLES.generic;

  let ringClass = "border-[var(--border-strong)] bg-[var(--bg-panel)]";
  if (isSelected) {
    ringClass = "border-[var(--accent-blue)] bg-[var(--accent-blue-surface)] ring-2 ring-[var(--accent-blue)]";
  } else if (isInBlastRadius) {
    ringClass = "border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/50";
  } else if (isInDepChain) {
    ringClass = "border-[var(--outgoing-amber)] bg-[var(--outgoing-amber-surface)] ring-1 ring-[var(--outgoing-amber)]/50";
  }

  return (
    <div
      className={`rounded border px-2.5 py-1.5 shadow-xs transition-all cursor-pointer min-w-[190px] max-w-[270px] ${ringClass}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[var(--border-strong)]" />
      <div className="flex items-center justify-between gap-1 mb-1">
        <span
          className={`rounded px-1 py-0.2 font-mono text-[9px] font-semibold border ${kindStyle.bg} ${kindStyle.text} ${kindStyle.border}`}
        >
          {kindStyle.label}
        </span>
        <div className="flex items-center gap-1 font-mono text-[9px]">
          <span className="rounded bg-[var(--incoming-green-surface)] text-[var(--incoming-green)] px-1 border border-[var(--incoming-green-border)]">
            +{fanIn}
          </span>
          <span className="rounded bg-[var(--outgoing-amber-surface)] text-[var(--outgoing-amber)] px-1 border border-[var(--outgoing-amber-border)]">
            -{fanOut}
          </span>
        </div>
      </div>
      <div
        className={`font-mono text-xs truncate ${
          isSelected ? "font-semibold text-[var(--accent-blue)]" : "text-[var(--text-primary)]"
        }`}
        title={label}
      >
        {label}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[var(--border-strong)]" />
    </div>
  );
}

// Custom folded folder container node
function FolderNodeComponent({ data }: NodeProps<Node<CustomFolderNodeData>>) {
  const { folderId, folderPath, filesCount, onToggleFold } = data;

  return (
    <div className="rounded border-2 border-dashed border-[var(--outgoing-amber)] bg-[var(--outgoing-amber-surface)]/80 p-2.5 shadow-xs cursor-pointer min-w-[220px]">
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-[var(--outgoing-amber)]" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 truncate">
          <FolderClosed size={15} className="text-[var(--outgoing-amber)] shrink-0" />
          <span className="font-mono text-xs font-semibold text-[var(--text-primary)] truncate" title={folderPath}>
            {folderPath}/
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFold(folderId);
          }}
          className="rounded border border-[var(--outgoing-amber-border)] bg-[var(--bg-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--outgoing-amber)] hover:bg-[var(--outgoing-amber-surface)]"
        >
          Expand ({filesCount})
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-[var(--outgoing-amber)]" />
    </div>
  );
}

const nodeTypes = {
  fileNode: FileNodeComponent,
  folderNode: FolderNodeComponent,
};

export function CenterCanvas({
  files,
  edges,
  metrics,
  classifications,
  selectedFileId,
  onSelectFile,
  onParseSample,
  isLoading,
  folders,
  foldedFolderIds,
  onToggleFold,
  onFoldAll,
  onUnfoldAll,
}: CenterCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomFileNodeData | CustomFolderNodeData>>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Compute blast radius and dependency chain for active selection
  const blastRadius = selectedFileId
    ? calculateBlastRadius(selectedFileId, edges)
    : { level1: [], level2: [], transitive: [], distances: {} };
  const depChain = selectedFileId
    ? calculateDependencyChain(selectedFileId, edges)
    : { level1: [], level2: [], transitive: [], distances: {} };

  const blastSet = new Set(blastRadius.transitive);
  const depSet = new Set(depChain.transitive);

  // Recalculate layout with dagre when files, folded folders, or edges change
  useEffect(() => {
    if (files.length === 0) {
      setNodes([]);
      setFlowEdges([]);
      return;
    }

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "LR", nodesep: 35, ranksep: 90 });

    const rawNodes: Node<CustomFileNodeData | CustomFolderNodeData>[] = [];
    const addedNodeIds = new Set<string>();

    // 1. Add folder nodes for folded folders
    folders.forEach((folder) => {
      if (foldedFolderIds.has(folder.id)) {
        if (!addedNodeIds.has(folder.id)) {
          addedNodeIds.add(folder.id);
          rawNodes.push({
            id: folder.id,
            type: "folderNode",
            position: { x: 0, y: 0 },
            data: {
              folderId: folder.id,
              folderPath: folder.path,
              filesCount: folder.files.length,
              onToggleFold,
            },
          });
          dagreGraph.setNode(folder.id, { width: 230, height: 48 });
        }
      }
    });

    // 2. Add individual file nodes for files that are not hidden inside folded folders
    for (const file of files) {
      const visualId = getVisualNodeIdForFile(file.path, foldedFolderIds);
      if (visualId === file.path) {
        if (!addedNodeIds.has(file.path)) {
          addedNodeIds.add(file.path);
          const fileMetric = metrics[file.path] || { fanIn: 0, fanOut: 0 };
          const isSelected = file.path === selectedFileId;
          const isInBlastRadius = blastSet.has(file.path);
          const isInDepChain = depSet.has(file.path);

          rawNodes.push({
            id: file.path,
            type: "fileNode",
            position: { x: 0, y: 0 },
            data: {
              label: file.path,
              fanIn: fileMetric.fanIn,
              fanOut: fileMetric.fanOut,
              classification: classifications.get(file.path),
              isSelected,
              isInBlastRadius,
              isInDepChain,
            },
          });
          dagreGraph.setNode(file.path, { width: 230, height: 56 });
        }
      }
    }

    // 3. Roll up edges based on folded folders
    const rolledEdges = rollUpEdges(edges, foldedFolderIds);
    const rawEdges: Edge[] = [];

    for (const rEdge of rolledEdges) {
      if (!addedNodeIds.has(rEdge.source) || !addedNodeIds.has(rEdge.target)) {
        continue;
      }

      const isIncoming = selectedFileId && rEdge.target === selectedFileId;
      const isOutgoing = selectedFileId && rEdge.source === selectedFileId;

      let strokeColor = "var(--border-strong)";
      let strokeWidth = 1.2;

      if (isIncoming) {
        strokeColor = "var(--incoming-green)";
        strokeWidth = 2;
      } else if (isOutgoing) {
        strokeColor = "var(--outgoing-amber)";
        strokeWidth = 2;
      }

      rawEdges.push({
        id: rEdge.id,
        source: rEdge.source,
        target: rEdge.target,
        type: "smoothstep",
        animated: false,
        label: rEdge.count > 1 ? `${rEdge.count} imports` : undefined,
        labelStyle: {
          fontFamily: "monospace",
          fontSize: 9,
          fill: "var(--text-muted)",
        },
        labelBgStyle: {
          fill: "var(--bg-panel)",
          stroke: "var(--border-subtle)",
        },
        style: {
          stroke: strokeColor,
          strokeWidth,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 14,
          height: 14,
        },
      });

      dagreGraph.setEdge(rEdge.source, rEdge.target);
    }

    dagre.layout(dagreGraph);

    const layoutedNodes = rawNodes.map((node) => {
      const nodePos = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: (nodePos?.x || 0) - 115,
          y: (nodePos?.y || 0) - 24,
        },
      };
    });

    setNodes(layoutedNodes);
    setFlowEdges(rawEdges);
  }, [
    files,
    edges,
    metrics,
    classifications,
    selectedFileId,
    folders,
    foldedFolderIds,
    setNodes,
    setFlowEdges,
    onToggleFold,
  ]);

  if (files.length === 0 && !isLoading) {
    return (
      <main className="relative flex flex-1 items-center justify-center bg-[var(--bg-canvas)]">
        <div className="max-w-md text-center p-6 border border-[var(--border-subtle)] bg-[var(--bg-panel)] rounded">
          <Network className="mx-auto text-[var(--accent-blue)] mb-3" size={32} />
          <h2 className="font-mono text-sm font-semibold text-[var(--text-primary)]">
            NO CODEBASE LOADED
          </h2>
          <p className="font-mono text-xs text-[var(--text-muted)] mt-1.5 mb-4">
            Enter a local directory path in the top bar or load the sample fixture app to parse the dependency map.
          </p>
          <button
            type="button"
            onClick={onParseSample}
            className="inline-flex items-center gap-1.5 rounded bg-[var(--accent-blue)] px-3 py-1.5 font-mono text-xs font-medium text-white shadow-xs hover:opacity-95 transition-opacity"
          >
            <Play size={13} />
            <span>Load Sample App (fixtures/sample-app)</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex-1 h-full bg-[var(--bg-canvas)] overflow-hidden">
      {/* Top canvas controls bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-1.5 shadow-xs font-mono text-xs">
        <span className="text-[var(--text-muted)] text-[11px] mr-1">Folders:</span>
        <button
          type="button"
          onClick={onFoldAll}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-panel)]"
        >
          <ChevronRight size={12} />
          <span>Fold All</span>
        </button>
        <button
          type="button"
          onClick={onUnfoldAll}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border border-[var(--border-subtle)] bg-[var(--bg-panel-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-panel)]"
        >
          <ChevronDown size={12} />
          <span>Unfold All</span>
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => {
          if (node.type === "fileNode") {
            onSelectFile(node.id);
          } else if (node.type === "folderNode") {
            onToggleFold(node.id);
          }
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background gap={16} size={1} color="var(--border-subtle)" />
        <Controls className="!bg-[var(--bg-panel)] !border-[var(--border-subtle)] !text-[var(--text-primary)]" />
        <MiniMap
          nodeColor={(node) =>
            node.id === selectedFileId
              ? "var(--accent-blue)"
              : "var(--border-strong)"
          }
          className="!bg-[var(--bg-panel)] !border-[var(--border-subtle)]"
          zoomable
          pannable
        />
      </ReactFlow>

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 font-mono text-[11px] shadow-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[var(--incoming-green)]" />
          <span className="text-[var(--text-secondary)]">Incoming (+Fan-in)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[var(--outgoing-amber)]" />
          <span className="text-[var(--text-secondary)]">Outgoing (-Fan-out)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[var(--accent-blue)]" />
          <span className="text-[var(--text-secondary)]">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="text-[var(--text-secondary)]">Blast Radius</span>
        </div>
      </div>
    </main>
  );
}
