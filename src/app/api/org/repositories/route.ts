import { NextResponse } from "next/server";
import { getRequestOrgContext } from "@/lib/auth/organization";
import {
  listOrganizationRepositories,
  saveRepositoryAndAnalysis,
} from "@/lib/supabase/client";

export async function GET() {
  try {
    const auth = await getRequestOrgContext();
    const repos = await listOrganizationRepositories(auth);
    return NextResponse.json({
      success: true,
      orgId: auth.orgId,
      repositories: repos,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list repositories";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getRequestOrgContext();
    const body = await request.json().catch(() => ({}));

    const { repo, analysis } = body;
    if (!repo?.url || !repo?.name) {
      return NextResponse.json(
        { error: "Repository url and name are required." },
        { status: 400 }
      );
    }

    const result = await saveRepositoryAndAnalysis(auth, repo, {
      filesCount: analysis?.filesCount || 0,
      edgesCount: analysis?.edgesCount || 0,
      summaryJson: analysis?.summaryJson || {},
    });

    return NextResponse.json({
      success: true,
      orgId: auth.orgId,
      data: result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save analysis";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
