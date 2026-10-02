# Phase 01: Core Architecture, Standalone Parser & Shell

## Behaviour

### 1. Standalone Code Parser
- Accepts a directory path and parses all TypeScript and JavaScript files (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`).
- Does not import or depend on Next.js, React, or any database client.
- Extracts dependencies from:
  - Static `import` declarations (default, named, namespace, type-only marked accordingly).
  - Re-export statements (`export ... from '...'`).
  - Dynamic imports (`import('...')`).
  - CommonJS `require('...')`.
- Resolves relative paths (`./`, `../`), index resolution (`/index.ts`, etc.), and file extensions.
- Resolves `tsconfig.json` path aliases if present in the target directory.
- Differentiates external node modules/built-ins from internal project files.
- Enforces strict edge resolution: an edge only exists if the target resolves to a real file in the codebase.
- Produces a coverage report stating:
  - Total files encountered.
  - Successfully parsed files.
  - Skipped files (e.g. non-JS/TS, binary, node_modules, git, build artifacts) with categorized reasons.
  - Unresolved imports with the source file, import specifier, and failure reason (never approximate or guessed).

### 2. Pure Graph Engine
- Functions purely over the file list and edge list without side-effects or network calls.
- Calculates:
  - Fan-in (number of files that import this file).
  - Fan-out (number of files this file imports).
  - Direct upstream dependencies (files imported by target).
  - Direct downstream dependents (files that import target).

### 3. Application Shell & Interface
- A dense developer tool layout adhering to the design constraints:
  - Small type, tight spacing, monospace for file paths.
  - Greyscale surfaces and borders, accent blue for selection/actions, green for incoming edges, amber for outgoing edges.
  - Dark and light theme switcher with three modes: follow system, force light, force dark. Preference persists across page reloads in `localStorage`.
  - Fixed panel shell:
    - Top bar: Project selector / directory path input and parse trigger button.
    - Left panel: File tree and parsed coverage summary (files parsed, skipped, unresolved).
    - Center area: Graph workspace canvas with view toggle and status indicators.
    - Right panel: File inspector showing selected file path, fan-in/fan-out metrics, incoming dependencies, outgoing imports, and unresolved notice if any.
- Runnable standalone from a terminal script (`pnpm test:parser` or `tsx src/parser/cli.ts <path>`) as well as through the local application API.

## Acceptance Check

1. Run the terminal command `pnpm test:parser` against a directory. Verify that it prints a list of parsed files, real resolved edges, fan-in/fan-out counts, and a coverage breakdown of skipped files and unresolved imports without throwing errors.
2. Start the local server with `pnpm dev` and open `http://localhost:3000` in the browser.
3. Verify the dense developer UI shell loads with:
   - Monospace typography for paths.
   - Fixed 3-panel layout (Left: Files & Coverage, Center: Map canvas area, Right: File Inspector).
   - Theme toggle switching between System, Dark, and Light, with the state preserved on hard page reload.
4. In the top bar, enter a directory path (e.g., `./` or a sample folder) and click "Parse Codebase".
5. Verify that:
   - Files appear in the left panel organized by path.
   - The coverage card reports parsed files count and skipped files count.
   - Clicking any file populates the right Inspector panel with its exact path in monospace, fan-in count, fan-out count, and lists of its imported files and files that import it.
   - Direction colors match the rule: incoming dependencies displayed with green accents, outgoing imports with amber accents.
