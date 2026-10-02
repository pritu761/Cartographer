import type { DependencyEdge, ParsedFile } from "@/parser/types";
import { calculateBlastRadius, calculateDependencyChain } from "@/graph/blast-radius";
import type { FileClassification } from "@/adapters/types";

export interface LookupStep {
  toolName: string;
  args: Record<string, unknown>;
  summary: string;
  data: unknown;
}

export function executeLookupFile(
  filePath: string,
  files: readonly ParsedFile[],
  classifications: Map<string, FileClassification>
): LookupStep {
  const file = files.find(
    (f) =>
      f.path.toLowerCase() === filePath.toLowerCase() ||
      f.path.toLowerCase().endsWith(filePath.toLowerCase())
  );

  if (!file) {
    return {
      toolName: "lookup_file",
      args: { filePath },
      summary: `File not found in repository: "${filePath}"`,
      data: null,
    };
  }

  const cls = classifications.get(file.path);
  return {
    toolName: "lookup_file",
    args: { filePath },
    summary: `Found "${file.path}" (${cls?.kind || "generic"}, ${(file.sizeBytes / 1024).toFixed(1)} KB, ${file.rawImports.length} raw imports)`,
    data: {
      path: file.path,
      kind: cls?.kind || "generic",
      sizeBytes: file.sizeBytes,
      imports: file.rawImports.map((i) => i.specifier),
    },
  };
}

export function executeLookupDependencies(
  filePath: string,
  files: readonly ParsedFile[],
  edges: readonly DependencyEdge[]
): LookupStep {
  const target = files.find(
    (f) =>
      f.path.toLowerCase() === filePath.toLowerCase() ||
      f.path.toLowerCase().endsWith(filePath.toLowerCase())
  );
  const actualPath = target ? target.path : filePath;

  const outgoing = edges.filter((e) => e.from === actualPath);
  return {
    toolName: "lookup_dependencies",
    args: { filePath: actualPath },
    summary: `Found ${outgoing.length} direct upstream dependencies for "${actualPath}"`,
    data: outgoing.map((e) => ({ to: e.to, kind: e.kind })),
  };
}

export function executeLookupDependents(
  filePath: string,
  files: readonly ParsedFile[],
  edges: readonly DependencyEdge[]
): LookupStep {
  const target = files.find(
    (f) =>
      f.path.toLowerCase() === filePath.toLowerCase() ||
      f.path.toLowerCase().endsWith(filePath.toLowerCase())
  );
  const actualPath = target ? target.path : filePath;

  const incoming = edges.filter((e) => e.to === actualPath);
  return {
    toolName: "lookup_dependents",
    args: { filePath: actualPath },
    summary: `Found ${incoming.length} direct downstream dependents that import "${actualPath}"`,
    data: incoming.map((e) => ({ from: e.from, kind: e.kind })),
  };
}

export function executeLookupBlastRadius(
  filePath: string,
  files: readonly ParsedFile[],
  edges: readonly DependencyEdge[]
): LookupStep {
  const target = files.find(
    (f) =>
      f.path.toLowerCase() === filePath.toLowerCase() ||
      f.path.toLowerCase().endsWith(filePath.toLowerCase())
  );
  const actualPath = target ? target.path : filePath;

  const radius = calculateBlastRadius(actualPath, edges);
  return {
    toolName: "lookup_blast_radius",
    args: { filePath: actualPath },
    summary: `Calculated blast radius for "${actualPath}": ${radius.level1.length} direct, ${radius.level2.length} 2-hop, ${radius.transitive.length} total`,
    data: {
      level1: radius.level1,
      level2: radius.level2,
      transitive: radius.transitive,
      distances: radius.distances,
    },
  };
}

export function executeLookupDependencyChain(
  filePath: string,
  files: readonly ParsedFile[],
  edges: readonly DependencyEdge[]
): LookupStep {
  const target = files.find(
    (f) =>
      f.path.toLowerCase() === filePath.toLowerCase() ||
      f.path.toLowerCase().endsWith(filePath.toLowerCase())
  );
  const actualPath = target ? target.path : filePath;

  const chain = calculateDependencyChain(actualPath, edges);
  return {
    toolName: "lookup_dependency_chain",
    args: { filePath: actualPath },
    summary: `Calculated dependency chain for "${actualPath}": ${chain.transitive.length} total upstream files`,
    data: {
      level1: chain.level1,
      level2: chain.level2,
      transitive: chain.transitive,
      distances: chain.distances,
    },
  };
}

export function executeSearchFiles(
  query: string,
  files: readonly ParsedFile[]
): LookupStep {
  const q = query.toLowerCase();
  const matched = files
    .filter((f) => f.path.toLowerCase().includes(q))
    .slice(0, 10);

  return {
    toolName: "search_files",
    args: { query },
    summary: `Found ${matched.length} files matching "${query}"`,
    data: matched.map((m) => m.path),
  };
}
