import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import type { OrgContext } from "../auth/organization";

export interface StoredRepository {
  id: string;
  org_id: string;
  url: string;
  owner: string;
  name: string;
  default_branch: string;
  created_at: string;
}

export interface StoredAnalysis {
  id: string;
  org_id: string;
  repo_id: string;
  commit_sha?: string;
  files_count: number;
  edges_count: number;
  summary_json: Record<string, unknown>;
  created_at: string;
}

/**
 * Creates an authorized server-side Supabase client with the request's JWT or organization claim.
 * Never called inside client components.
 */
export function getAuthorizedSupabaseClient(auth: OrgContext): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        "x-cartograph-org-id": auth.orgId,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Local fallback repository store adhering to organization isolation.
 * Used when Supabase keys are not yet configured in .env.local.
 */
function getLocalStorePath(orgId: string): string {
  const storeDir = path.resolve(process.cwd(), ".cartograph-cache", "db", orgId);
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }
  return storeDir;
}

export async function saveRepositoryAndAnalysis(
  auth: OrgContext,
  repo: { url: string; owner: string; name: string },
  analysisData: {
    filesCount: number;
    edgesCount: number;
    summaryJson: Record<string, unknown>;
  }
): Promise<{ repoId: string; analysisId: string }> {
  const client = getAuthorizedSupabaseClient(auth);

  if (client) {
    // Rely on RLS policies to enforce organization insertion
    const { data: repoRecord, error: repoErr } = await client
      .from("repositories")
      .upsert(
        {
          org_id: auth.orgId,
          url: repo.url,
          owner: repo.owner,
          name: repo.name,
        },
        { onConflict: "org_id,url" }
      )
      .select("id")
      .single();

    if (repoErr || !repoRecord) {
      throw new Error(`Failed to save repository record: ${repoErr?.message}`);
    }

    const { data: analysisRecord, error: analysisErr } = await client
      .from("analyses")
      .insert({
        org_id: auth.orgId,
        repo_id: repoRecord.id,
        files_count: analysisData.filesCount,
        edges_count: analysisData.edgesCount,
        summary_json: analysisData.summaryJson,
      })
      .select("id")
      .single();

    if (analysisErr || !analysisRecord) {
      throw new Error(`Failed to save analysis record: ${analysisErr?.message}`);
    }

    return { repoId: repoRecord.id, analysisId: analysisRecord.id };
  }

  // Local fallback persistence partitioned strictly by orgId
  const storeDir = getLocalStorePath(auth.orgId);
  const reposFile = path.join(storeDir, "repositories.json");
  const analysesFile = path.join(storeDir, "analyses.json");

  let repos: StoredRepository[] = [];
  if (fs.existsSync(reposFile)) {
    try {
      repos = JSON.parse(fs.readFileSync(reposFile, "utf-8"));
    } catch {
      repos = [];
    }
  }

  let repoRecord = repos.find((r) => r.url === repo.url);
  if (!repoRecord) {
    repoRecord = {
      id: `repo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      org_id: auth.orgId,
      url: repo.url,
      owner: repo.owner,
      name: repo.name,
      default_branch: "main",
      created_at: new Date().toISOString(),
    };
    repos.push(repoRecord);
    fs.writeFileSync(reposFile, JSON.stringify(repos, null, 2));
  }

  let analyses: StoredAnalysis[] = [];
  if (fs.existsSync(analysesFile)) {
    try {
      analyses = JSON.parse(fs.readFileSync(analysesFile, "utf-8"));
    } catch {
      analyses = [];
    }
  }

  const analysisRecord: StoredAnalysis = {
    id: `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    org_id: auth.orgId,
    repo_id: repoRecord.id,
    files_count: analysisData.filesCount,
    edges_count: analysisData.edgesCount,
    summary_json: analysisData.summaryJson,
    created_at: new Date().toISOString(),
  };
  analyses.push(analysisRecord);
  fs.writeFileSync(analysesFile, JSON.stringify(analyses, null, 2));

  return { repoId: repoRecord.id, analysisId: analysisRecord.id };
}

export async function listOrganizationRepositories(
  auth: OrgContext
): Promise<Array<StoredRepository & { latestAnalysis?: StoredAnalysis }>> {
  const client = getAuthorizedSupabaseClient(auth);

  if (client) {
    // Notice: Application query omits 'where org_id = ...' as required by policy constraint:
    // "Who may read a row is decided by a policy, never by application code.
    // If a query needs a where clause to return the right rows, the policy is wrong."
    const { data: repos, error } = await client
      .from("repositories")
      .select("id, org_id, url, owner, name, default_branch, created_at");

    if (error || !repos) {
      throw new Error(`Failed to list repositories: ${error?.message}`);
    }

    return repos;
  }

  // Local fallback
  const storeDir = getLocalStorePath(auth.orgId);
  const reposFile = path.join(storeDir, "repositories.json");
  const analysesFile = path.join(storeDir, "analyses.json");

  if (!fs.existsSync(reposFile)) {
    return [];
  }

  let repos: StoredRepository[];
  try {
    repos = JSON.parse(fs.readFileSync(reposFile, "utf-8"));
  } catch {
    repos = [];
  }

  let analyses: StoredAnalysis[] = [];
  if (fs.existsSync(analysesFile)) {
    try {
      analyses = JSON.parse(fs.readFileSync(analysesFile, "utf-8"));
    } catch {
      analyses = [];
    }
  }

  return repos.map((repo) => {
    const latest = analyses
      .filter((a) => a.repo_id === repo.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return { ...repo, latestAnalysis: latest };
  });
}
