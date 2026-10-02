import type { DependencyEdge, ParsedFile } from "../parser/types";

export interface FileMetrics {
  fanIn: number; // Count of files that import this file (incoming)
  fanOut: number; // Count of files imported by this file (outgoing)
}

export interface FileGraphDetails {
  file: ParsedFile;
  metrics: FileMetrics;
  upstreamDependencies: DependencyEdge[]; // Outgoing edges (this file -> target)
  downstreamDependents: DependencyEdge[]; // Incoming edges (other file -> this file)
}
