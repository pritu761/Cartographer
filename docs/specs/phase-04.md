# Phase 04: Organization Identity, Supabase Schema & Row-Level Security

## Behaviour

### 1. Identity & Organization Context
- Clerk integration provides user sign-in and organization switching.
- Identity is represented as a token carrying the active organization claim (`org_id`).
- Authorization decisions read the organization from the token without querying the identity provider at runtime.
- The UI displays current user/org status with sign-in controls and an active organization selector in the top bar.
- If credentials are not yet configured in `.env.local`, a local development fallback context (`org_demo_local`) activates gracefully so the application remains fully functional.

### 2. Database Schema & Strict Row-Level Security (RLS)
- SQL migrations in `supabase/migrations/` defining the multi-tenant schema:
  - `repositories`: tracks mapped repositories (`id`, `org_id`, `url`, `owner`, `name`, `default_branch`, `created_at`).
  - `analyses`: stores parsed repository snapshots (`id`, `org_id`, `repo_id`, `commit_sha`, `files_count`, `edges_count`, `summary_json`, `created_at`).
  - `file_explanations`: cached explanations by file path and org.
- RLS enabled across all tables:
  - Every table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
  - Organization isolation policy: rows are only visible if `org_id` matches the token claim.
  - Queries in application code omit manual `where org_id = ...` authorization filters — authorization is guaranteed by the database policy itself.

### 3. Server Data Layer & Analysis Persistence
- Database queries run exclusively within server code (route handlers / server actions), never inside client components.
- Saving an analysis:
  - When a codebase is parsed, users can save the analysis to their organization.
  - The analysis snapshot is stored under the organization ID.
- Loading an analysis:
  - Previously analyzed repositories for the active organization are displayed in a quick switcher.
  - Selecting a saved analysis restores its files, edges, and coverage metrics instantly.

## Acceptance Check

1. Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` in the terminal to verify zero errors or warnings.
2. Review the SQL migration file to verify that:
   - Every created table explicitly enables Row Level Security.
   - Security policies check `org_id` against the token's JWT claims.
3. Start the application with `pnpm dev` and open [http://localhost:3000](http://localhost:3000) in the browser.
4. Verify the top bar displays the active organization indicator and sign-in status.
5. Parse a repository (e.g. `fixtures/sample-app`), then click "Save Analysis to Organization":
   - Verify the analysis is saved under the active organization.
   - Verify saved repositories appear in the repository switcher.
6. Verify database access is isolated to server code and policies.
