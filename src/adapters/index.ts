import type { ParsedFile } from "../parser/types";
import { nextjsAdapter } from "./nextjs-adapter";
import type { FileClassification, FileKind, FrameworkAdapter } from "./types";

export * from "./types";
export * from "./nextjs-adapter";

const KNOWN_ADAPTERS: FrameworkAdapter[] = [nextjsAdapter];

/**
 * Pure fallback classifier when no specific framework adapter detects the repository.
 */
function fallbackClassifier(file: ParsedFile): FileClassification {
  const p = file.path.toLowerCase();
  const basename = p.split("/").pop() || "";

  if (
    basename.includes("config.") ||
    basename.startsWith(".") ||
    basename.endsWith(".json")
  ) {
    return { kind: "config", reason: "Configuration file" };
  }

  if (p.includes("/components/") || p.includes("/ui/")) {
    return { kind: "component", reason: "UI Component" };
  }

  if (
    p.includes("/utils/") ||
    p.includes("/lib/") ||
    p.includes("/services/") ||
    p.includes("/helpers/")
  ) {
    return { kind: "utility", reason: "Utility module" };
  }

  if (basename.includes(".test.") || basename.includes(".spec.")) {
    return { kind: "test", reason: "Test file" };
  }

  return { kind: "generic", reason: "Source file" };
}

/**
 * Classifies all files using the matching framework adapter or standard fallback.
 * Strictly decoupled: Parser never invokes or imports this.
 */
export function classifyAllFiles(
  files: readonly ParsedFile[]
): Map<string, FileClassification> {
  const activeAdapter = KNOWN_ADAPTERS.find((a) => a.detect(files));
  const resultMap = new Map<string, FileClassification>();

  for (const file of files) {
    if (activeAdapter) {
      resultMap.set(file.path, activeAdapter.classify(file, files));
    } else {
      resultMap.set(file.path, fallbackClassifier(file));
    }
  }

  return resultMap;
}

/**
 * Color hue tokens for file kinds following the project-doc rule:
 * "kind: a file gets a colour for what sort of thing it is, with enough hues to separate a handful of categories and no more."
 */
export const KIND_COLOR_STYLES: Record<
  FileKind,
  { bg: string; text: string; border: string; label: string }
> = {
  page: {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    label: "Page",
  },
  layout: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/30",
    label: "Layout",
  },
  "route-handler": {
    bg: "bg-cyan-500/10",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/30",
    label: "API Route",
  },
  middleware: {
    bg: "bg-pink-500/10",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-500/30",
    label: "Middleware",
  },
  "server-action": {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/30",
    label: "Action",
  },
  component: {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/30",
    label: "Component",
  },
  utility: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    label: "Utility",
  },
  config: {
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/30",
    label: "Config",
  },
  test: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
    label: "Test",
  },
  generic: {
    bg: "bg-neutral-500/10",
    text: "text-neutral-600 dark:text-neutral-400",
    border: "border-neutral-500/30",
    label: "Module",
  },
};
