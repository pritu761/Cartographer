import type { ParsedFile } from "../parser/types";

export type FileKind =
  | "page"
  | "layout"
  | "route-handler"
  | "middleware"
  | "server-action"
  | "component"
  | "utility"
  | "config"
  | "test"
  | "generic";

export interface FileClassification {
  kind: FileKind;
  reason?: string;
}

export interface FrameworkAdapter {
  name: string;
  detect: (files: readonly ParsedFile[]) => boolean;
  classify: (file: ParsedFile, allFiles: readonly ParsedFile[]) => FileClassification;
}
