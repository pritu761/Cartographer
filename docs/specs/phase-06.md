# Phase 06: Grounded Repository Chat Agent with Visible Graph Lookups

## Behaviour

### 1. Grounded Agent Tooling (Graph Arithmetic Driven)
- The agent does not traverse the graph itself or guess relationships.
- All structural inquiries execute through pure graph lookup tools:
  - `lookup_file`: Retrieves verified file kind, size, and direct imports.
  - `lookup_dependencies`: Runs pure arithmetic to retrieve upstream files.
  - `lookup_dependents`: Runs pure arithmetic to retrieve downstream files.
  - `lookup_blast_radius`: Computes exact 1-hop, 2-hop, and transitive affected files.
  - `search_files`: Searches the verified file list for matching paths.

### 2. Mandatory Lookup Execution & Trace Visibility
- Rule: An answer arriving with no lookups behind it is forbidden.
- For every query, the agent plans and executes one or more lookups against the verified repository data.
- The UI exposes a visible lookup trace before the answer:
  - Step-by-step badges showing each executed query and its returned facts (e.g. "Queried blast radius of `src/utils/math.ts` -> 3 affected files").
  - Clear distinction between facts discovered via lookups and the explanation generated from those facts.

### 3. Integrated Chat Interface
- A developer chat panel integrated into the workspace shell.
- Features:
  - Question input with suggestion prompts (e.g., "What depends on this file?", "What breaks if I modify the utils?").
  - Message stream with visible collapsible lookup steps.
  - Interactive file tags: clicking any file path in the chat response jumps directly to and highlights that file on the map.
  - Ground truth check applied to chat responses: mentions of files absent from the codebase are flagged.

## Acceptance Check

1. Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` in the terminal to verify zero errors or warnings.
2. Run `pnpm dev` and open [http://localhost:3000](http://localhost:3000).
3. Open the Chat panel in the interface.
4. Ask a structural question: "What files depend on `src/utils/math.ts`?"
5. Verify that:
   - The UI visibly displays the lookup actions taken before the answer (e.g., `lookup_dependents("src/utils/math.ts")`).
   - The answer lists only real files verified by the lookups.
   - Clicking a file path in the answer selects and highlights that file in the canvas and inspector.
6. Verify no scores, ratings, or code review commentary appear in the chat responses.
