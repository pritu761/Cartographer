# Phase 07: Ship Criteria Audit, Five-File Ground Truth Verification & Quality Gate

## Behaviour

### 1. Automated Ship Verification Suite
- A rigorous verification suite executing all six mandatory conditions from `docs/project-doc.md`:
  1. **Five-File Ground Truth Audit:** Five files checked by hand match exactly what the parser claims they import (covering static imports, dynamic imports, CommonJS require, re-exports, and tsconfig aliases).
  2. **Believable Coverage Audit:** Asserts all skipped files have explicit categorized reasons and that unresolved imports never fail silently.
  3. **Multi-Tenant RLS Audit:** Verifies that 100% of tables in the database schema have Row Level Security enabled, and that querying from a different organization returns zero rows.
  4. **Strict Hallucination Check:** Demonstrates by algorithmic check that explanations never reference a file absent from the repository.
  5. **Pre-Answer Lookup Audit:** Proves that the chat agent never answers without executing verified graph arithmetic lookups first.
  6. **Quantitative Groundedness Quality Score:** Computes a numeric quality metric (0 to 100%) evaluating groundedness and neighbour precision.

### 2. In-App Quality Gate & Audit Dashboard
- An interactive Quality Gate modal accessible from the Top Bar ("Ship Audit").
- Displays real-time pass/fail status and audit evidence for each of the six shipping criteria.
- Developers can re-run the complete verification gate directly from the UI or terminal.

## Acceptance Check

1. Run the terminal command `pnpm test:audit`. Verify that all six ship criteria pass with explicit evidence and zero failures.
2. Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` to verify zero errors or warnings.
3. Run `pnpm dev` and open [http://localhost:3000](http://localhost:3000).
4. Click the "Ship Audit" badge in the Top Bar.
5. Verify the Audit modal displays all six criteria passing:
   - 5-file ground truth check verified.
   - RLS on 100% of tables verified.
   - Zero absent file references verified.
   - Lookup-backed chat responses verified.
   - Believable coverage reporting verified.
   - Numeric AI quality score calculated and reported.
