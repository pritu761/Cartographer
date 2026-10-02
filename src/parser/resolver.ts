import fs from "node:fs";
import path from "node:path";

export interface PathAliasConfig {
  baseUrl: string;
  paths: Record<string, string[]>;
}

const EXTENSIONS_TO_TRY = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".d.ts",
];

const INDEX_EXTENSIONS = [
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "index.mjs",
  "index.cjs",
];

const NODE_BUILTINS = new Set([
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "path/posix",
  "path/win32",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "stream/promises",
  "stream/web",
  "string_decoder",
  "sys",
  "timers",
  "timers/promises",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "util/types",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
]);

/**
 * Normalizes system paths to forward slashes for deterministic, cross-platform file IDs.
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Loads tsconfig.json or jsconfig.json to extract path aliases without running tsc.
 */
export function loadPathAliases(rootPath: string): PathAliasConfig | null {
  const tsconfigPath = path.join(rootPath, "tsconfig.json");
  const jsconfigPath = path.join(rootPath, "jsconfig.json");
  const configFile = fs.existsSync(tsconfigPath)
    ? tsconfigPath
    : fs.existsSync(jsconfigPath)
      ? jsconfigPath
      : null;

  if (!configFile) {
    return null;
  }

  try {
    const raw = fs.readFileSync(configFile, "utf-8");
    // Strip single-line and multi-line comments from tsconfig JSON
    const cleanJson = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*/g, "");
    const parsed = JSON.parse(cleanJson);
    const compilerOptions = parsed.compilerOptions || {};
    const baseUrl = path.resolve(rootPath, compilerOptions.baseUrl || ".");
    const paths = compilerOptions.paths || {};

    return { baseUrl, paths };
  } catch {
    // If parsing tsconfig fails, we fall back to relative resolution without guessing
    return null;
  }
}

export interface ResolveResult {
  status: "resolved" | "unresolved" | "external";
  resolvedRelativePath?: string;
  reason?: string;
}

/**
 * Resolves an import specifier from a source file into a verified on-disk relative path.
 * Adheres strictly to the rule: Never invent an edge. If a file isn't on disk, it is unresolved.
 */
export function resolveImportSpecifier(
  sourceRelativePath: string,
  specifier: string,
  rootPath: string,
  aliasConfig: PathAliasConfig | null
): ResolveResult {
  // Check for node built-ins (e.g., "fs", "node:path")
  if (specifier.startsWith("node:")) {
    return { status: "external", reason: "node-builtin" };
  }
  const cleanBuiltinName = specifier.replace(/^node:/, "");
  if (NODE_BUILTINS.has(cleanBuiltinName)) {
    return { status: "external", reason: "node-builtin" };
  }

  const sourceAbsDir = path.dirname(path.resolve(rootPath, sourceRelativePath));

  // Case 1: Relative imports
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const candidateBase = path.resolve(sourceAbsDir, specifier);
    const resolved = findExistingFile(candidateBase, rootPath);
    if (resolved) {
      return { status: "resolved", resolvedRelativePath: resolved };
    }
    return {
      status: "unresolved",
      reason: `Relative file target not found on disk: "${specifier}"`,
    };
  }

  // Case 2: tsconfig path aliases
  if (aliasConfig && Object.keys(aliasConfig.paths).length > 0) {
    for (const [aliasPattern, targetPatterns] of Object.entries(aliasConfig.paths)) {
      const isWildcard = aliasPattern.endsWith("/*");
      const prefix = isWildcard ? aliasPattern.slice(0, -2) : aliasPattern;

      let matched = false;
      let suffix = "";

      if (isWildcard && specifier.startsWith(`${prefix}/`)) {
        matched = true;
        suffix = specifier.slice(prefix.length + 1);
      } else if (!isWildcard && specifier === aliasPattern) {
        matched = true;
        suffix = "";
      }

      if (matched) {
        for (const targetPattern of targetPatterns) {
          const targetPrefix = targetPattern.endsWith("/*")
            ? targetPattern.slice(0, -2)
            : targetPattern;
          const candidateAbs = path.resolve(
            aliasConfig.baseUrl,
            suffix ? `${targetPrefix}/${suffix}` : targetPrefix
          );
          const resolved = findExistingFile(candidateAbs, rootPath);
          if (resolved) {
            return { status: "resolved", resolvedRelativePath: resolved };
          }
        }
      }
    }
  }

  // Case 3: Absolute imports or package dependencies
  // If it does not start with relative indicator or resolved alias, it is treated as external
  return {
    status: "external",
    reason: `External dependency or unresolved module: "${specifier}"`,
  };
}

/**
 * Checks potential file extensions and directory index candidates on disk.
 * Returns relative path from root if verified on disk, or null.
 */
function findExistingFile(candidateAbs: string, rootPath: string): string | null {
  // Direct file check with various extensions
  for (const ext of EXTENSIONS_TO_TRY) {
    const filePath = ext ? `${candidateAbs}${ext}` : candidateAbs;
    if (fs.existsSync(filePath)) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          return normalizePath(path.relative(rootPath, filePath));
        }
      } catch {
        // Continue if stat fails
      }
    }
  }

  // TypeScript ESM sometimes specifies .js while source is .ts or .tsx
  if (candidateAbs.endsWith(".js")) {
    const stripped = candidateAbs.slice(0, -3);
    for (const altExt of [".ts", ".tsx"]) {
      const altPath = `${stripped}${altExt}`;
      if (fs.existsSync(altPath) && fs.statSync(altPath).isFile()) {
        return normalizePath(path.relative(rootPath, altPath));
      }
    }
  }

  // Directory index file check
  if (fs.existsSync(candidateAbs)) {
    try {
      const stat = fs.statSync(candidateAbs);
      if (stat.isDirectory()) {
        for (const indexName of INDEX_EXTENSIONS) {
          const indexPath = path.join(candidateAbs, indexName);
          if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
            return normalizePath(path.relative(rootPath, indexPath));
          }
        }
      }
    } catch {
      // Continue if directory stat fails
    }
  }

  return null;
}
