-- Migration 001: Initial schema with Organization-based Row Level Security (RLS)
-- Decision: Access control is enforced by database policies, not application code filters.
-- Decision: RLS is enabled on every table by default.

-- 1. Repositories table
CREATE TABLE IF NOT EXISTS public.repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL,
    url TEXT NOT NULL,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, url)
);

-- Enable RLS on repositories
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view repositories belonging to their active organization claim
CREATE POLICY "org_select_repositories" ON public.repositories
    FOR SELECT
    USING (
        org_id = coalesce(
            (current_setting('request.jwt.claims', true))::jsonb ->> 'org_id',
            (current_setting('request.jwt.claims', true))::jsonb -> 'user_metadata' ->> 'org_id',
            ''
        )
    );

-- Policy: Users can insert repositories for their active organization
CREATE POLICY "org_insert_repositories" ON public.repositories
    FOR INSERT
    WITH CHECK (
        org_id = coalesce(
            (current_setting('request.jwt.claims', true))::jsonb ->> 'org_id',
            (current_setting('request.jwt.claims', true))::jsonb -> 'user_metadata' ->> 'org_id',
            ''
        )
    );

-- 2. Analyses table (snapshots of parsed dependency graphs)
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL,
    repo_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    commit_sha TEXT,
    files_count INT NOT NULL DEFAULT 0,
    edges_count INT NOT NULL DEFAULT 0,
    summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on analyses
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_analyses" ON public.analyses
    FOR SELECT
    USING (
        org_id = coalesce(
            (current_setting('request.jwt.claims', true))::jsonb ->> 'org_id',
            (current_setting('request.jwt.claims', true))::jsonb -> 'user_metadata' ->> 'org_id',
            ''
        )
    );

CREATE POLICY "org_insert_analyses" ON public.analyses
    FOR INSERT
    WITH CHECK (
        org_id = coalesce(
            (current_setting('request.jwt.claims', true))::jsonb ->> 'org_id',
            (current_setting('request.jwt.claims', true))::jsonb -> 'user_metadata' ->> 'org_id',
            ''
        )
    );

-- 3. File Explanations table (AI explanation cache per file & org)
CREATE TABLE IF NOT EXISTS public.file_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL,
    repo_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    explanation_text TEXT NOT NULL,
    model_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, repo_id, file_path)
);

-- Enable RLS on file_explanations
ALTER TABLE public.file_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_file_explanations" ON public.file_explanations
    FOR SELECT
    USING (
        org_id = coalesce(
            (current_setting('request.jwt.claims', true))::jsonb ->> 'org_id',
            (current_setting('request.jwt.claims', true))::jsonb -> 'user_metadata' ->> 'org_id',
            ''
        )
    );

CREATE POLICY "org_insert_file_explanations" ON public.file_explanations
    FOR INSERT
    WITH CHECK (
        org_id = coalesce(
            (current_setting('request.jwt.claims', true))::jsonb ->> 'org_id',
            (current_setting('request.jwt.claims', true))::jsonb -> 'user_metadata' ->> 'org_id',
            ''
        )
    );
