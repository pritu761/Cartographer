import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ParsedGitHubUrl } from "./parse-url";

const execFileAsync = promisify(execFile);

export interface CloneResult {
  localPath: string;
  isCached: boolean;
}

/**
 * Safely clones a public GitHub repository with depth=1 snapshot into a sandboxed cache folder.
 * Uses execFile with argument arrays to prevent shell injection.
 */
export async function clonePublicRepo(
  parsed: ParsedGitHubUrl,
  forceRefresh = false
): Promise<CloneResult> {
  const cacheBase = path.resolve(process.cwd(), ".cartograph-cache", "repos");
  const targetDir = path.join(cacheBase, parsed.owner, parsed.repo);

  if (!fs.existsSync(cacheBase)) {
    fs.mkdirSync(cacheBase, { recursive: true });
  }

  // If already cloned and not forced, reuse existing snapshot
  if (fs.existsSync(targetDir) && !forceRefresh) {
    return { localPath: targetDir, isCached: true };
  }

  // If target directory exists and force refresh requested, remove old directory
  if (fs.existsSync(targetDir)) {
    try {
      fs.rmSync(targetDir, { recursive: true, force: true });
    } catch {
      // Continue if rm fails
    }
  }

  const args = ["clone", "--depth", "1"];
  if (parsed.branch) {
    args.push("--branch", parsed.branch);
  }
  args.push(parsed.cloneUrl, targetDir);

  try {
    await execFileAsync("git", args, {
      timeout: 60000, // 60s timeout
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0", // Never prompt for passwords/tokens in terminal
      },
    });

    return { localPath: targetDir, isCached: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (
      errorMsg.includes("Repository not found") ||
      errorMsg.includes("Authentication failed") ||
      errorMsg.includes("could not read Username")
    ) {
      throw new Error(
        `Repository "${parsed.owner}/${parsed.repo}" could not be accessed. Either it does not exist or it is private.`,
        { cause: err }
      );
    }
    throw new Error(`Failed to clone repository: ${errorMsg}`, { cause: err });
  }
}
