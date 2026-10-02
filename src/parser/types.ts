/**
 * Types for Cartograph's standalone parser.
 * Strict independence: This module must not import React, Next.js, or any database client.
 */

export type ImportKind =
  | "static-import"
  | "dynamic-import"
  | "re-export"
  | "require";

export interface RawImport {
  specifier: string;
  kind: ImportKind;
  line: number;
  isTypeOnly: boolean;
}

export interface DependencyEdge {
  from: string; // Relative file path from repo root (e.g. "src/index.ts")
  to: string; // Relative file path from repo root (e.g. "src/utils/math.ts")
  rawSpecifier: string;
  kind: ImportKind;
  isTypeOnly: boolean;
}

export interface UnresolvedImport {
  file: string; // Source file relative path
  specifier: string;
  line: number;
  reason: string;
  isExternal: boolean; // True if identified as a node_modules package or builtin
}

export type SkippedReason =
  | "ignored-directory"
  | "unsupported-extension"
  | "binary-file"
  | "parse-error";

export interface SkippedFile {
  path: string; // Relative file path
  reason: SkippedReason;
  message?: string;
}

export interface ParsedFile {
  id: string; // Normalized relative path, unique ID
  path: string; // Normalized relative path
  extension: string;
  sizeBytes: number;
  rawImports: RawImport[];
}

export interface CoverageReport {
  totalEncounteredFiles: number;
  parsedFilesCount: number;
  skippedFilesCount: number;
  internalEdgesCount: number;
  unresolvedImportsCount: number;
  externalDependenciesCount: number;
  skippedFiles: SkippedFile[];
  unresolvedImports: UnresolvedImport[];
}

export interface ParseResult {
  rootPath: string;
  files: ParsedFile[];
  edges: DependencyEdge[];
  coverage: CoverageReport;
}
