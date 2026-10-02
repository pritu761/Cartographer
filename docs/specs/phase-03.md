# Phase 03: Public GitHub Repository Ingestion & Live Progress Streaming

## Behaviour

### 1. GitHub Repository URL Ingestion
- Accepts public GitHub repository URLs in multiple standard formats:
  - Full HTTPS: `https://github.com/owner/repo`
  - Short form: `owner/repo`
  - Branch or tree URLs: `https://github.com/owner/repo/tree/branch`
- Validates the repository input and enforces public access constraints (no private repository tokens stored).
- Clones/downloads a shallow snapshot of the repository into a sandboxed local workspace cache.
- Prevents directory traversal attacks and normalizes cache paths.

### 2. Live Streaming Progress
- Exposes a streaming endpoint delivering real-time progress events using Server-Sent Events (SSE) or chunked streams:
  - `status`: Current lifecycle phase (`cloning`, `scanning`, `parsing`, `resolving`, `complete`, `error`).
  - `progress`: Percentage or processed files counter (`X / Y files`).
  - `message`: User-facing description of the immediate operation.
- The UI displays a live progress status bar in the top navigation during analysis.
- If a repository cannot be accessed (e.g. not found, private, or invalid URL), returns a clean, visible error message without crashing.

### 3. Immediate Graph & Coverage Integration
- When streaming completes, the application automatically loads the newly parsed repository:
  - The map updates with real nodes, edges, folders, and framework classifications.
  - The coverage report updates with exact statistics: total encountered files, parsed code files, skipped files (with reasons), and external packages.
  - History / Quick Switcher allows jumping between previously analyzed repositories and built-in fixtures.

## Acceptance Check

1. Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` in the terminal to verify zero errors or warnings.
2. Run `pnpm dev` and open [http://localhost:3000](http://localhost:3000) in the browser.
3. In the top bar input, enter a public GitHub repository (e.g., `facebook/react` or a small public repo like `vercel/ms` or `sindresorhus/is`).
4. Click "Parse Repository":
   - Verify the live progress indicator appears, displaying real-time stages (fetching snapshot -> discovering files -> AST parsing -> resolving graph).
   - Upon completion, verify the graph canvas populates with the real files and dependency edges of that repository.
   - Verify the coverage report displays total files, parsed files, and categorized skipped files.
5. Enter an invalid or non-existent repository URL (e.g., `github.com/nonexistent/fake-repo-12345`) and verify that a clear error message is displayed to the user without breaking the interface.
