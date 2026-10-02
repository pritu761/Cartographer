# Phase 05: Traced AI File Explanations, Mandatory Cache & Hallucination Verification

## Behaviour

### 1. Single Traced AI Client
- Exactly one module constructs and wraps the AI client with LangSmith tracing.
- Any direct instantiation elsewhere is prevented to guarantee all AI invocations are traced.
- Graceful mock/fallback mode operates if `OPENAI_API_KEY` is not present, simulating realistic explanations and cache behavior without breaking the application.

### 2. Mandatory Caching Inside Trace Run
- Every AI operation executes inside a traced run.
- Cache inspection occurs *inside* the traced function:
  - On a cache hit: returns the cached paragraph; the trace records a completed run containing zero model calls.
  - On a cache miss: invokes the model, caches the result in the database/store, and records the model call within the trace.

### 3. File Context & Neighbourhood Gathering
- An explanation prompt is constructed strictly from:
  - The target file's content and path.
  - Its direct upstream dependencies (files it imports).
  - Its direct downstream dependents (files that import it).
- Generates a single concise developer paragraph explaining the file's purpose and its role among its neighbours (no ratings, scores, or code reviews).

### 4. Ground Truth Verification Check (Zero Absent Files)
- Every generated explanation runs through a mandatory hallucination verification check.
- The check extracts all file paths and filenames referenced in the AI output and validates each one against the verified repository file list.
- If any file path mentioned by the AI is absent from the repository:
  - The check fails loudly and flags the hallucinated name.
  - The explanation is flagged or sanitized to ensure no fictitious files reach the developer.
- The UI displays a "Verified Ground Truth" status indicator confirming that every mentioned file exists on disk.

## Acceptance Check

1. Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` in the terminal to verify zero errors or warnings.
2. Run `pnpm dev` and open [http://localhost:3000](http://localhost:3000) in the browser.
3. Select any file (e.g. `src/utils/math.ts`) and click "Explain File":
   - Verify an explanation paragraph appears explaining the file and referencing its real neighbours.
   - Verify the "Ground Truth Check" badge confirms that all mentioned files exist in the repository.
4. Click "Explain File" again on the same file:
   - Verify the response is instantaneous.
   - Verify the badge indicates "Cache Hit" (served from cache, zero additional model tokens).
5. Inspect the verification check code to confirm that an absent filename fails the check and is reported loudly.
