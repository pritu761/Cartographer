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
import { Network, Play } from "lucide-react";
import type { DependencyEdge, ParsedFile } from "@/parser/types";

interface CenterCanvasProps {
  files: ParsedFile[];
  edges: DependencyEdge[];
  metrics: Record<string, { fanIn: number; fanOut: number }>;
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onParseSample: () => void;
  isLoading: boolean;
}

interface CustomNodeData {
  label: string;
  fanIn: number;
  fanOut: number;
  isSelected: boolean;
  [key: string]: unknown;
}

// Custom file node matching dense developer aesthetic
function FileNodeComponent({ data }: NodeProps<Node<CustomNodeData>>) {
  const { label, fanIn, fanOut, isSelected } = data;

  return (
    <div
      className={`rounded border px-2.5 py-1.5 shadow-xs transition-colors cursor-pointer min-w-[180px] max-w-[260px] ${
        isSelected
          ? "border-[var(--accent-blue)] bg-[var(--accent-blue-surface)] ring-1 ring-[var(--accent-blue)]"
          : "border-[var(--border-strong)] bg-[var(--bg-panel)] hover:border-[var(--accent-blue)]"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[var(--border-strong)]" />
      <div className="flex items-center justify-between gap-2">
        <span
          className={`font-mono text-xs truncate ${
            isSelected ? "font-semibold text-[var(--accent-blue)]" : "text-[var(--text-primary)]"
          }`}
          title={label}
        >
          {label}
        </span>
        <div className="flex items-center gap-1 shrink-0 font-mono text-[9px]">
          <span className="rounded bg-[var(--incoming-green-surface)] text-[var(--incoming-green)] px-1 border border-[var(--incoming-green-border)]">
            +{fanIn}
          </span>
          <span className="rounded bg-[var(--outgoing-amber-surface)] text-[var(--outgoing-amber)] px-1 border border-[var(--outgoing-amber-border)]">
            -{fanOut}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[var(--border-strong)]" />
    </div>
  );
}

const nodeTypes = {
  fileNode: FileNodeComponent,
};

export function CenterCanvas({
  files,
  edges,
  metrics,
  selectedFileId,
  onSelectFile,
  onParseSample,
  isLoading,
}: CenterCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Calculate layout with dagre whenever files or edges change
  useEffect(() => {
    if (files.length === 0) {
      setNodes([]);
      setFlowEdges([]);
      return;
    }

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "LR", nodesep: 35, ranksep: 80 });

    const rawNodes: Node<CustomNodeData>[] = files.map((file) => {
      const fileMetric = metrics[file.path] || { fanIn: 0, fanOut: 0 };
      const isSelected = file.path === selectedFileId;

      return {
        id: file.path,
        type: "fileNode",
        position: { x: 0, y: 0 },
        data: {
          label: file.path,
          fanIn: fileMetric.fanIn,
          fanOut: fileMetric.fanOut,
          isSelected,
        },
      };
    });

    rawNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 220, height: 44 });
    });

    const rawEdges: Edge[] = edges.map((e, index) => {
      const isIncoming = selectedFileId && e.to === selectedFileId;
      const isOutgoing = selectedFileId && e.from === selectedFileId;

      let strokeColor = "var(--border-strong)";
      let strokeWidth = 1.2;

      if (isIncoming) {
        strokeColor = "var(--incoming-green)";
        strokeWidth = 2;
      } else if (isOutgoing) {
        strokeColor = "var(--outgoing-amber)";
        strokeWidth = 2;
      }

      return {
        id: `e-${index}-${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        type: "smoothstep",
        animated: false,
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
      };
    });

    rawEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = rawNodes.map((node) => {
      const nodePos = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: (nodePos?.x || 0) - 110,
          y: (nodePos?.y || 0) - 22,
        },
      };
    });

    setNodes(layoutedNodes);
    setFlowEdges(rawEdges);
  }, [files, edges, metrics, selectedFileId, setNodes, setFlowEdges]);

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
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelectFile(node.id)}
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
          <span className="text-[var(--text-secondary)]">Selected File</span>
        </div>
      </div>
    </main>
  );
}
