import { NextResponse } from "next/server";
import { getRequestOrgContext } from "@/lib/auth/organization";
import { explainFileTraced } from "@/lib/ai/explanation-service";

export async function POST(request: Request) {
  try {
    const auth = await getRequestOrgContext();
    const body = await request.json().catch(() => ({}));

    const {
      filePath,
      repoUrl,
      allRepoFiles,
      upstreamDependencies,
      downstreamDependents,
    } = body;

    if (!filePath || !allRepoFiles) {
      return NextResponse.json(
        { error: "filePath and allRepoFiles are required." },
        { status: 400 }
      );
    }

    const result = await explainFileTraced(auth, {
      filePath,
      repoUrl: repoUrl || "local",
      allRepoFiles,
      upstreamDependencies: upstreamDependencies || [],
      downstreamDependents: downstreamDependents || [],
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to explain file";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
