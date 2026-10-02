# Phase 02: Folder Folding, Blast Radius Arithmetic & Framework Adapters

## Behaviour

### 1. Framework Knowledge Adapter System
- A pluggable adapter interface operating outside the parser.
- The parser remains completely unaware of frameworks (no framework checks or imports).
- Adapters inspect file paths, export signatures, and conventions to classify files into kinds:
  - `page`, `layout`, `route-handler`, `middleware`, `server-action`, `component`, `utility`, `config`, or `generic`.
- Implementation of the Next.js App Router / Pages Router adapter to identify route files and layouts.
- Files visually display their classified kind with dedicated subtle kind badges and category hues.

### 2. Folder Folding & Hierarchical Map
- Files group into hierarchical folder containers based on their directory paths.
- Folders can fold (collapse into a compact box) or unfold (expand to display individual files).
- Edge roll-up:
  - When a folder is folded, any import to or from any file within that folder rolls up to connect to the folder container itself.
  - When unfolded, edges connect directly to the specific child files.
- Double-clicking or clicking a folder toggle expands or collapses it.

### 3. Pure Blast Radius & Dependency Chain Arithmetic
- Pure graph traversal functions operating strictly over the edge list with cycle detection:
  - **Dependency Chain (Upstream):** Transitive closure of all files this file depends on directly and indirectly (`A imports B imports C`).
  - **Blast Radius (Downstream):** Transitive closure of all files that depend on this file directly and indirectly (`C imported by B imported by A`).
  - Distance metrics: Level 1 (direct), Level 2 (two hops out), and transitive totals.
- Calculations run instantly in memory in the browser with zero network requests or spinners.
- The Inspector panel displays the blast radius count, affected files broken down by hop distance, and the full dependency chain.
- Clicking any affected file in the blast radius jumps the selection to that file.

## Acceptance Check

1. Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` in the terminal to verify zero errors or warnings.
2. Run `pnpm dev` and open [http://localhost:3000](http://localhost:3000) in the browser.
3. Verify that files are classified by the Next.js adapter (e.g., config, utility, legacy, generic) and show kind indicators.
4. On the map canvas or sidebar:
   - Folders (e.g., `src/utils`) appear as grouped boxes.
   - Clicking a folder collapse/expand toggle folds the folder into a single box with edge roll-up, and expanding it restores child node edges.
5. In the file inspector:
   - Select a low-level utility file (e.g., `src/utils/math.ts`).
   - Verify the **Blast Radius** section shows which files break two levels out (e.g. `src/utils/index.ts`, `src/legacy/helper.js`, and `src/app.ts`), displaying the exact hop count.
   - Verify the **Dependency Chain** section displays upstream dependencies.
   - Verify the calculations render instantaneously without network delay.
