import fs from "node:fs";
import path from "node:path";
import { traceable } from "langsmith/traceable";
import { tracedOpenAIClient } from "./client";
import {
  verifyExplanationGroundTruth,
  type GroundTruthVerificationResult,
} from "./hallucination-checker";
import { getAuthorizedSupabaseClient } from "../supabase/client";
import type { OrgContext } from "../auth/organization";

export interface ExplanationRequest {
  filePath: string;
  repoUrl: string;
  allRepoFiles: string[];
  upstreamDependencies: string[];
  downstreamDependents: string[];
  fileContentSnippet?: string;
}

export interface ExplanationResponse {
  explanation: string;
  isCacheHit: boolean;
  modelName: string;
  verification: GroundTruthVerificationResult;
}

/**
 * Local file cache for explanations per organization when Supabase is not connected.
 */
function getLocalExplanation(orgId: string, cacheKey: string): string | null {
  const cacheFile = path.resolve(
    process.cwd(),
    ".cartograph-cache",
    "db",
    orgId,
    "explanations.json"
  );
  if (!fs.existsSync(cacheFile)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    return data[cacheKey] || null;
  } catch {
    return null;
  }
}

function setLocalExplanation(
  orgId: string,
  cacheKey: string,
  explanation: string
): void {
  const cacheDir = path.resolve(process.cwd(), ".cartograph-cache", "db", orgId);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const cacheFile = path.join(cacheDir, "explanations.json");
  let data: Record<string, string> = {};
  if (fs.existsSync(cacheFile)) {
    try {
      data = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    } catch {
      data = {};
    }
  }

  data[cacheKey] = explanation;
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
}

/**
 * Core traced explanation function.
 * Rule: Every AI call has a cache read inside its trace, so a cache hit shows up
 * as a recorded run with no model call in it.
 */
export const explainFileTraced = traceable(
  async function explainFile(
    auth: OrgContext,
    req: ExplanationRequest
  ): Promise<ExplanationResponse> {
    const cacheKey = `${req.repoUrl}:::${req.filePath}`;
    const modelName = "gpt-4o-mini";

    // 1. Mandatory Cache Read INSIDE the traced function
    const supabase = getAuthorizedSupabaseClient(auth);
    let cachedExplanation: string | null = null;

    if (supabase) {
      const { data } = await supabase
        .from("file_explanations")
        .select("explanation_text")
        .eq("file_path", req.filePath)
        .maybeSingle();

      if (data?.explanation_text) {
        cachedExplanation = data.explanation_text;
      }
    } else {
      cachedExplanation = getLocalExplanation(auth.orgId, cacheKey);
    }

    if (cachedExplanation) {
      const verification = verifyExplanationGroundTruth(
        cachedExplanation,
        req.allRepoFiles
      );

      return {
        explanation: cachedExplanation,
        isCacheHit: true,
        modelName,
        verification,
      };
    }

    // 2. Cache Miss: Execute Model Invocations
    let generatedExplanation: string;
    const hasApiKey = Boolean(
      process.env.OPENAI_API_KEY &&
        process.env.OPENAI_API_KEY !== "dummy_key_for_mock"
    );

    if (hasApiKey) {
      const prompt = `
You are Cartograph's codebase structural explainer.
Explain what this file is and how it connects to its neighbours.
Rule 1: Ground all statements strictly in the provided file path and neighbours.
Rule 2: Never name or invent any file absent from the repository.
Rule 3: Write exactly one concise paragraph. Do not give code quality scores, ratings, or severity badges.

File to explain: \`${req.filePath}\`
Direct Upstream Dependencies (files it imports): ${
        req.upstreamDependencies.length > 0
          ? req.upstreamDependencies.map((f) => `\`${f}\``).join(", ")
          : "None"
      }
Direct Downstream Dependents (files that import it): ${
        req.downstreamDependents.length > 0
          ? req.downstreamDependents.map((f) => `\`${f}\``).join(", ")
          : "None"
      }
`.trim();

      const completion = await tracedOpenAIClient.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      generatedExplanation =
        completion.choices[0]?.message?.content?.trim() || "";
    } else {
      // Offline fallback: generates deterministic ground-truth explanation strictly from real neighbours
      const upstreamText =
        req.upstreamDependencies.length > 0
          ? `It imports ${req.upstreamDependencies
              .slice(0, 3)
              .map((u) => `\`${u}\``)
              .join(", ")}.`
          : "It has no local upstream dependencies.";

      const downstreamText =
        req.downstreamDependents.length > 0
          ? `It is imported directly by ${req.downstreamDependents
              .slice(0, 3)
              .map((d) => `\`${d}\``)
              .join(", ")}.`
          : "It is an entry point or leaf module with no direct dependents.";

      generatedExplanation = `\`${req.filePath}\` is a module within the codebase. ${upstreamText} ${downstreamText} Its role is determined by these verified structural connections.`;
    }

    // 3. Strict Ground Truth Verification
    const verification = verifyExplanationGroundTruth(
      generatedExplanation,
      req.allRepoFiles
    );

    // 4. Save to Cache
    if (supabase) {
      try {
        await supabase.from("file_explanations").upsert(
          {
            org_id: auth.orgId,
            file_path: req.filePath,
            explanation_text: generatedExplanation,
            model_name: modelName,
          },
          { onConflict: "org_id,file_path" }
        );
      } catch {
        // Continue if remote cache write fails
      }
    } else {
      setLocalExplanation(auth.orgId, cacheKey, generatedExplanation);
    }

    return {
      explanation: generatedExplanation,
      isCacheHit: false,
      modelName,
      verification,
    };
  },
  { name: "cartograph.explain_file" }
);
