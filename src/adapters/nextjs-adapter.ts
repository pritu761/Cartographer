import type { ParsedFile } from "../parser/types";
import type { FileClassification, FrameworkAdapter } from "./types";

export const nextjsAdapter: FrameworkAdapter = {
  name: "nextjs",

  detect(files: readonly ParsedFile[]): boolean {
    return files.some(
      (f) =>
        f.path.includes("next.config") ||
        f.path.includes("/app/") ||
        f.path.startsWith("app/") ||
        f.path.includes("/pages/") ||
        f.path.startsWith("pages/")
    );
  },

  classify(file: ParsedFile): FileClassification {
    const p = file.path.toLowerCase();
    const basename = p.split("/").pop() || "";

    // 1. Config files
    if (
      basename.startsWith("next.config.") ||
      basename.startsWith("postcss.config.") ||
      basename.startsWith("tailwind.config.") ||
      basename.startsWith("eslint.config.") ||
      basename.startsWith("tsconfig")
    ) {
      return { kind: "config", reason: "Framework or tool configuration" };
    }

    // 2. Tests
    if (
      p.includes("__tests__") ||
      basename.includes(".test.") ||
      basename.includes(".spec.")
    ) {
      return { kind: "test", reason: "Automated test suite" };
    }

    // 3. Next.js App Router conventions
    if (p.includes("/app/") || p.startsWith("app/")) {
      if (basename.startsWith("page.")) {
        return { kind: "page", reason: "Next.js App Router Page" };
      }
      if (basename.startsWith("layout.")) {
        return { kind: "layout", reason: "Next.js App Router Layout" };
      }
      if (basename.startsWith("route.")) {
        return { kind: "route-handler", reason: "Next.js App Router Route Handler" };
      }
      if (basename.startsWith("loading.") || basename.startsWith("error.") || basename.startsWith("not-found.")) {
        return { kind: "layout", reason: "Next.js App Router Boundary" };
      }
    }

    // 4. Next.js Pages Router conventions
    if (p.includes("/pages/") || p.startsWith("pages/")) {
      if (p.includes("/api/")) {
        return { kind: "route-handler", reason: "Next.js API Route" };
      }
      if (basename.startsWith("_app.") || basename.startsWith("_document.")) {
        return { kind: "layout", reason: "Next.js Root Document / App" };
      }
      return { kind: "page", reason: "Next.js Pages Router Page" };
    }

    // 5. Middleware
    if (basename.startsWith("middleware.")) {
      return { kind: "middleware", reason: "Next.js Middleware" };
    }

    // 6. Components
    if (p.includes("/components/") || p.includes("/ui/")) {
      return { kind: "component", reason: "UI Component" };
    }

    // 7. Utilities, services, helpers
    if (
      p.includes("/utils/") ||
      p.includes("/lib/") ||
      p.includes("/services/") ||
      p.includes("/helpers/") ||
      p.includes("/legacy/")
    ) {
      return { kind: "utility", reason: "Utility or service module" };
    }

    return { kind: "generic", reason: "Standard module" };
  },
};
