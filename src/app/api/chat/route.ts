import { NextResponse } from "next/server";
import { runChatAgent } from "@/lib/agent/runner";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { query, files, edges, selectedFileId } = body;

    if (!query || !files || !edges) {
      return NextResponse.json(
        { error: "query, files, and edges are required." },
        { status: 400 }
      );
    }

    const result = await runChatAgent({
      query,
      files,
      edges,
      selectedFileId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat agent execution failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
