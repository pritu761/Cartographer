import fs from "node:fs";
import path from "node:path";
import {
  type CoverageReport,
  type DependencyEdge,
  type ParsedFile,
  type ParseResult,
  type SkippedFile,
  type UnresolvedImport,
} from "./types";
import {
  loadPathAliases,
  normalizePath,
  resolveImportSpecifier,
} from "./resolver";
import { createParserProject, extractRawImports } from "./parse-file";

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".cache",
  "out",
  ".vscode",
  ".gemini",
]);

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
]);

export interface ParseProgressEvent {
  stage: "scanning" | "parsing" | "resolving";
  current: number;
  total: number;
  message: string;
}

export type ParseProgressCallback = (event: ParseProgressEvent) => void;

/**
 * Standalone parser engine.
 * Reads a directory, parses every supported file using AST, resolves dependencies,
 * and produces exact edges and a strict coverage report.
 */
export async function parseDirectory(
  targetDirectory: string,
  onProgress?: ParseProgressCallback
): Promise<ParseResult> {
  const rootPath = path.resolve(targetDirectory);
  if (!fs.existsSync(rootPath)) {
    throw new Error(`Target path does not exist: ${rootPath}`);
  }

  const stat = fs.statSync(rootPath);
  if (!stat.isDirectory()) {
    throw new Error(`Target path is not a directory: ${rootPath}`);
  }

  onProgress?.({
    stage: "scanning",
    current: 0,
    total: 0,
    message: "Scanning directory tree...",
  });

  const aliasConfig = loadPathAliases(rootPath);
  const project = createParserProject();

  const files: ParsedFile[] = [];
  const edges: DependencyEdge[] = [];
  const skippedFiles: SkippedFile[] = [];
  const unresolvedImports: UnresolvedImport[] = [];
  let totalEncounteredFiles = 0;
  let externalDependenciesCount = 0;

  // File paths discovered for parsing
  const codeFilesToParse: Array<{ fullPath: string; relativePath: string; ext: string }> = [];

  // 1. Recursive file collection
  function traverse(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      skippedFiles.push({
        path: normalizePath(path.relative(rootPath, currentDir)),
        reason: "parse-error",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    for (const entry of entries) {
      const entryName = entry.name;
      const fullPath = path.join(currentDir, entryName);
      const relativePath = normalizePath(path.relative(rootPath, fullPath));

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entryName)) {
          skippedFiles.push({
            path: relativePath,
            reason: "ignored-directory",
            message: `Directory ignored by convention: ${entryName}`,
          });
          continue;
        }
        traverse(fullPath);
      } else if (entry.isFile()) {
        totalEncounteredFiles++;
        const ext = path.extname(entryName).toLowerCase();

        if (BINARY_EXTENSIONS.has(ext)) {
          skippedFiles.push({
            path: relativePath,
            reason: "binary-file",
            message: `Binary or media asset: ${ext}`,
          });
        } else if (!CODE_EXTENSIONS.has(ext)) {
          skippedFiles.push({
            path: relativePath,
            reason: "unsupported-extension",
            message: `Non-code or unparsed file extension: ${ext || "(no ext)"}`,
          });
        } else {
          codeFilesToParse.push({ fullPath, relativePath, ext });
        }
      }
    }
  }

  traverse(rootPath);

  // 2. Parse code files using AST
  const totalCodeFiles = codeFilesToParse.length;
  for (let i = 0; i < totalCodeFiles; i++) {
    const { fullPath, relativePath, ext } = codeFilesToParse[i];

    if (onProgress && (i % 5 === 0 || i === totalCodeFiles - 1)) {
      onProgress({
        stage: "parsing",
        current: i + 1,
        total: totalCodeFiles,
        message: `Parsing AST: ${relativePath}`,
      });
    }

    try {
      const fileStat = fs.statSync(fullPath);
      const sourceFile = project.addSourceFileAtPath(fullPath);
      const rawImports = extractRawImports(sourceFile);

      files.push({
        id: relativePath,
        path: relativePath,
        extension: ext,
        sizeBytes: fileStat.size,
        rawImports,
      });
    } catch (parseErr) {
      skippedFiles.push({
        path: relativePath,
        reason: "parse-error",
        message: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
    }
  }

  // 3. Resolve imports to strictly verified edges
  onProgress?.({
    stage: "resolving",
    current: 0,
    total: files.length,
    message: "Resolving dependency edges...",
  });

  const edgeKeys = new Set<string>();

  for (const file of files) {
    for (const imp of file.rawImports) {
      const resolution = resolveImportSpecifier(
        file.path,
        imp.specifier,
        rootPath,
        aliasConfig
      );

      if (resolution.status === "resolved" && resolution.resolvedRelativePath) {
        const edgeKey = `${file.path}:::${resolution.resolvedRelativePath}:::${imp.kind}`;
        if (!edgeKeys.has(edgeKey)) {
          edgeKeys.add(edgeKey);
          edges.push({
            from: file.path,
            to: resolution.resolvedRelativePath,
            rawSpecifier: imp.specifier,
            kind: imp.kind,
            isTypeOnly: imp.isTypeOnly,
          });
        }
      } else if (resolution.status === "external") {
        externalDependenciesCount++;
        unresolvedImports.push({
          file: file.path,
          specifier: imp.specifier,
          line: imp.line,
          reason: resolution.reason || "External package",
          isExternal: true,
        });
      } else {
        unresolvedImports.push({
          file: file.path,
          specifier: imp.specifier,
          line: imp.line,
          reason: resolution.reason || "Target file does not exist on disk",
          isExternal: false,
        });
      }
    }
  }

  const coverage: CoverageReport = {
    totalEncounteredFiles,
    parsedFilesCount: files.length,
    skippedFilesCount: skippedFiles.length,
    internalEdgesCount: edges.length,
    unresolvedImportsCount: unresolvedImports.filter((u) => !u.isExternal).length,
    externalDependenciesCount,
    skippedFiles,
    unresolvedImports,
  };

  return {
    rootPath: normalizePath(rootPath),
    files,
    edges,
    coverage,
  };
}
