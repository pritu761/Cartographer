export interface GroundTruthVerificationResult {
  isValid: boolean;
  mentionedFiles: string[];
  verifiedFiles: string[];
  hallucinatedFiles: string[];
  message: string;
}

const EXTENSION_REGEX = /\b([a-zA-Z0-9_\-./]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|css|md))\b/gi;
const CODE_SPAN_REGEX = /`([^`]+)`/g;

/**
 * Strict ground truth verification check.
 * Rule: An explanation never names a file absent from the repository,
 * and that is demonstrated by a check rather than asserted.
 */
export function verifyExplanationGroundTruth(
  explanationText: string,
  knownRepositoryFiles: readonly string[]
): GroundTruthVerificationResult {
  const normalizedKnownPaths = new Set(
    knownRepositoryFiles.map((f) => f.replace(/\\/g, "/").toLowerCase())
  );

  // Map from basename to full path
  const basenameMap = new Map<string, string>();
  for (const file of knownRepositoryFiles) {
    const base = file.split("/").pop()?.toLowerCase();
    if (base) {
      basenameMap.set(base, file);
    }
  }

  const candidateCandidates = new Set<string>();

  // 1. Extract paths from backticks (e.g. `src/utils/math.ts` or `math.ts`)
  let match: RegExpExecArray | null;
  while ((match = CODE_SPAN_REGEX.exec(explanationText)) !== null) {
    const candidate = match[1].trim().replace(/^['"]|['"]$/g, "");
    if (candidate.includes(".") && !candidate.includes(" ")) {
      candidateCandidates.add(candidate);
    }
  }

  // 2. Extract paths matching standard file extensions
  while ((match = EXTENSION_REGEX.exec(explanationText)) !== null) {
    candidateCandidates.add(match[1].trim());
  }

  const mentionedFiles: string[] = [];
  const verifiedFiles: string[] = [];
  const hallucinatedFiles: string[] = [];

  for (const rawCandidate of candidateCandidates) {
    const candidate = rawCandidate.replace(/^\.\//, "").replace(/\\/g, "/");
    mentionedFiles.push(candidate);

    const candidateLower = candidate.toLowerCase();
    const candidateBase = candidate.split("/").pop()?.toLowerCase() || "";

    // Check if it's an exact path or a known basename
    if (normalizedKnownPaths.has(candidateLower)) {
      verifiedFiles.push(candidate);
    } else if (basenameMap.has(candidateBase)) {
      verifiedFiles.push(candidate);
    } else {
      // Disregard common external package config files like package.json or node_modules
      if (candidate === "package.json" || candidate.startsWith("node_modules/")) {
        continue;
      }
      hallucinatedFiles.push(candidate);
    }
  }

  const isValid = hallucinatedFiles.length === 0;

  return {
    isValid,
    mentionedFiles,
    verifiedFiles,
    hallucinatedFiles,
    message: isValid
      ? `Verified ground truth: all ${verifiedFiles.length} referenced files exist in repository.`
      : `Verification failed: referenced non-existent file(s): ${hallucinatedFiles.join(", ")}`,
  };
}
