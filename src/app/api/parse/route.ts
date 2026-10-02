import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { parseDirectory } from "@/parser/parse-directory";
import { calculateAllMetrics } from "@/graph/calculations";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawTarget = body.targetPath?.trim() || "fixtures/sample-app";

    // Resolve target path relative to current working directory if not absolute
    const resolvedPath = path.isAbsolute(rawTarget)
      ? rawTarget
      : path.resolve(process.cwd(), rawTarget);

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: `Directory not found on disk: "${rawTarget}"` },
        { status: 400 }
      );
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return NextResponse.json(
        { error: `Target path is a file, not a directory: "${rawTarget}"` },
        { status: 400 }
      );
    }

    const parseResult = await parseDirectory(resolvedPath);
    const metricsMap = calculateAllMetrics(parseResult.files, parseResult.edges);

    // Convert map to serializable object
    const metrics: Record<string, { fanIn: number; fanOut: number }> = {};
    metricsMap.forEach((val, key) => {
      metrics[key] = val;
    });

    return NextResponse.json({
      success: true,
      data: {
        rootPath: parseResult.rootPath,
        files: parseResult.files,
        edges: parseResult.edges,
        coverage: parseResult.coverage,
        metrics,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal parse error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
