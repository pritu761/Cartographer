import type { DependencyEdge, ParsedFile } from "../parser/types";
import type { FileGraphDetails, FileMetrics } from "./types";

/**
 * Pure function: calculates fan-in (incoming) and fan-out (outgoing) edge counts for a file.
 */
export function calculateFileMetrics(
  filePath: string,
  edges: readonly DependencyEdge[]
): FileMetrics {
  let fanIn = 0;
  let fanOut = 0;

  for (const edge of edges) {
    if (edge.to === filePath) {
      fanIn++;
    }
    if (edge.from === filePath) {
      fanOut++;
    }
  }

  return { fanIn, fanOut };
}

/**
 * Pure function: returns all direct outgoing dependencies (files imported by this file).
 */
export function getUpstreamDependencies(
  filePath: string,
  edges: readonly DependencyEdge[]
): DependencyEdge[] {
  return edges.filter((edge) => edge.from === filePath);
}

/**
 * Pure function: returns all direct incoming dependents (files that import this file).
 */
export function getDownstreamDependents(
  filePath: string,
  edges: readonly DependencyEdge[]
): DependencyEdge[] {
  return edges.filter((edge) => edge.to === filePath);
}

/**
 * Pure function: calculates metrics for all files in one pass over the edge list.
 */
export function calculateAllMetrics(
  files: readonly ParsedFile[],
  edges: readonly DependencyEdge[]
): Map<string, FileMetrics> {
  const metricsMap = new Map<string, FileMetrics>();

  // Initialize 0 counts for every file
  for (const file of files) {
    metricsMap.set(file.path, { fanIn: 0, fanOut: 0 });
  }

  // Accumulate metrics from edges
  for (const edge of edges) {
    const fromMetrics = metricsMap.get(edge.from);
    if (fromMetrics) {
      fromMetrics.fanOut++;
    }

    const toMetrics = metricsMap.get(edge.to);
    if (toMetrics) {
      toMetrics.fanIn++;
    }
  }

  return metricsMap;
}

/**
 * Pure function: builds graph details for a selected file.
 */
export function getFileDetails(
  file: ParsedFile,
  edges: readonly DependencyEdge[]
): FileGraphDetails {
  const upstreamDependencies = getUpstreamDependencies(file.path, edges);
  const downstreamDependents = getDownstreamDependents(file.path, edges);

  return {
    file,
    metrics: {
      fanIn: downstreamDependents.length,
      fanOut: upstreamDependencies.length,
    },
    upstreamDependencies,
    downstreamDependents,
  };
}
