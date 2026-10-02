import fs from "node:fs";
import path from "node:path";
import { parseGitHubUrl } from "@/lib/github/parse-url";
import { clonePublicRepo } from "@/lib/github/clone-repo";
import { parseDirectory } from "@/parser/parse-directory";
import { calculateAllMetrics } from "@/graph/calculations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawInput = (body.input || "").trim() || "fixtures/sample-app";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        let targetDirectory: string;
        const ghParsed = parseGitHubUrl(rawInput);

        if (ghParsed) {
          sendEvent({
            type: "progress",
            stage: "cloning",
            current: 0,
            total: 100,
            message: `Fetching public repository: ${ghParsed.owner}/${ghParsed.repo}...`,
          });

          const cloneRes = await clonePublicRepo(ghParsed);
          targetDirectory = cloneRes.localPath;

          sendEvent({
            type: "progress",
            stage: "cloning",
            current: 100,
            total: 100,
            message: cloneRes.isCached
              ? `Loaded cached snapshot of ${ghParsed.owner}/${ghParsed.repo}`
              : `Cloned ${ghParsed.owner}/${ghParsed.repo} successfully`,
          });
        } else {
          // Local path
          targetDirectory = path.isAbsolute(rawInput)
            ? rawInput
            : path.resolve(process.cwd(), rawInput);

          if (!fs.existsSync(targetDirectory)) {
            sendEvent({
              type: "error",
              error: `Local directory not found: "${rawInput}"`,
            });
            controller.close();
            return;
          }

          const stat = fs.statSync(targetDirectory);
          if (!stat.isDirectory()) {
            sendEvent({
              type: "error",
              error: `Target path is a file, not a directory: "${rawInput}"`,
            });
            controller.close();
            return;
          }
        }

        // Run parser with live progress updates
        const parseResult = await parseDirectory(targetDirectory, (progress) => {
          sendEvent({
            type: "progress",
            ...progress,
          });
        });

        const metricsMap = calculateAllMetrics(parseResult.files, parseResult.edges);
        const metrics: Record<string, { fanIn: number; fanOut: number }> = {};
        metricsMap.forEach((val, key) => {
          metrics[key] = val;
        });

        sendEvent({
          type: "complete",
          data: {
            rootPath: parseResult.rootPath,
            files: parseResult.files,
            edges: parseResult.edges,
            coverage: parseResult.coverage,
            metrics,
          },
        });
      } catch (err) {
        sendEvent({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
