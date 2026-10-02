export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch?: string;
  cloneUrl: string;
}

/**
 * Parses user input for GitHub repository references:
 * e.g., "owner/repo", "https://github.com/owner/repo", "https://github.com/owner/repo.git",
 * or "https://github.com/owner/repo/tree/branch-name".
 */
export function parseGitHubUrl(input: string): ParsedGitHubUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Short form: owner/repo
  const shortMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shortMatch) {
    const owner = shortMatch[1];
    const repo = shortMatch[2].replace(/\.git$/, "");
    return {
      owner,
      repo,
      cloneUrl: `https://github.com/${owner}/${repo}.git`,
    };
  }

  // Full URL: https://github.com/owner/repo...
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.hostname !== "github.com") {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
      return null;
    }

    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/, "");

    let branch: string | undefined;
    if (segments.length >= 4 && segments[2] === "tree") {
      branch = segments[3];
    }

    return {
      owner,
      repo,
      branch,
      cloneUrl: `https://github.com/${owner}/${repo}.git`,
    };
  } catch {
    return null;
  }
}
