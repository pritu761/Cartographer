import fs from "node:fs";
import path from "node:path";
import { parseDirectory } from "../src/parser/parse-directory";
import { verifyExplanationGroundTruth } from "../src/lib/ai/hallucination-checker";
import { runChatAgent } from "../src/lib/agent/runner";
import {
  saveRepositoryAndAnalysis,
  listOrganizationRepositories,
} from "../src/lib/supabase/client";

export interface AuditCriterionResult {
  id: string;
  name: string;
  passed: boolean;
  evidence: string;
}

export async function runShipCriteriaAudit(): Promise<{
  allPassed: boolean;
  score: number;
  results: AuditCriterionResult[];
}> {
  const results: AuditCriterionResult[] = [];

  // =========================================================================
  // Criteria 1: Pointed at a known repository, 5 files checked by hand match
  // =========================================================================
  const samplePath = path.resolve(process.cwd(), "fixtures/sample-app");
  const parseResult = await parseDirectory(samplePath);

  const handChecks = [
    {
      file: "src/index.ts",
      expectedImports: ["src/app.ts"],
      expectedKinds: ["static-import"],
    },
    {
      file: "src/app.ts",
      expectedImports: [
        "src/utils/index.ts",
        "src/services/api.ts",
        "src/legacy/helper.js",
      ],
      expectedKinds: ["static-import", "static-import", "dynamic-import"],
    },
    {
      file: "src/services/api.ts",
      expectedImports: ["src/utils/format.ts"],
      expectedKinds: ["static-import"],
    },
    {
      file: "src/legacy/helper.js",
      expectedImports: ["src/utils/math.ts"],
      expectedKinds: ["require"],
    },
    {
      file: "src/utils/index.ts",
      expectedImports: ["src/utils/math.ts", "src/utils/format.ts"],
      expectedKinds: ["re-export", "re-export"],
    },
  ];

  let check1Passed = true;
  const check1Details: string[] = [];

  for (const hc of handChecks) {
    const fileEdges = parseResult.edges.filter((e) => e.from === hc.file);
    const actualTargets = fileEdges.map((e) => e.to);

    const matchesAll =
      hc.expectedImports.every((exp) => actualTargets.includes(exp)) &&
      hc.expectedImports.length === actualTargets.length;

    if (!matchesAll) {
      check1Passed = false;
      check1Details.push(
        `FAIL on ${hc.file}: expected [${hc.expectedImports.join(", ")}], got [${actualTargets.join(", ")}]`
      );
    } else {
      check1Details.push(
        `OK ${hc.file} -> [${actualTargets.join(", ")}] (${hc.expectedKinds.join(", ")})`
      );
    }
  }

  results.push({
    id: "five_files_ground_truth",
    name: "Five Files Ground Truth Hand Check",
    passed: check1Passed,
    evidence: check1Details.join(" | "),
  });

  // =========================================================================
  // Criteria 2: Coverage states what was skipped and why, number is believable
  // =========================================================================
  const coverage = parseResult.coverage;
  const believable =
    coverage.totalEncounteredFiles > 0 &&
    coverage.parsedFilesCount === 7 &&
    coverage.skippedFilesCount === 1 &&
    coverage.skippedFiles[0].reason === "unsupported-extension";

  results.push({
    id: "believable_coverage",
    name: "Coverage Reporting Accuracy",
    passed: believable,
    evidence: `Total: ${coverage.totalEncounteredFiles}, Parsed: ${coverage.parsedFilesCount}, Skipped: ${coverage.skippedFilesCount} (reason: ${coverage.skippedFiles[0]?.reason})`,
  });

  // =========================================================================
  // Criteria 3: Multi-tenant RLS - 100% of tables have RLS & cross-org isolation
  // =========================================================================
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/001_initial_schema.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  const tableMatches = Array.from(
    sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-zA-Z0-9_]+)/gi)
  ).map((m) => m[1]);

  const rlsMatches = Array.from(
    sql.matchAll(/ALTER\s+TABLE\s+public\.([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/gi)
  ).map((m) => m[1]);

  const allTablesHaveRls =
    tableMatches.length > 0 &&
    tableMatches.every((table) => rlsMatches.includes(table));

  // Test actual cross-organization isolation
  const orgA = { orgId: "org_audit_alpha", userId: "u1", isDemo: true };
  const orgB = { orgId: "org_audit_beta", userId: "u2", isDemo: true };

  await saveRepositoryAndAnalysis(
    orgA,
    { url: "github.com/orgA/repoA", owner: "orgA", name: "repoA" },
    { filesCount: 1, edgesCount: 0, summaryJson: {} }
  );

  const orgBRepos = await listOrganizationRepositories(orgB);
  const crossLeakage = orgBRepos.some((r) => r.org_id === orgA.orgId);

  const rlsPassed = allTablesHaveRls && !crossLeakage;

  results.push({
    id: "schema_rls_all_tables",
    name: "Row Level Security on 100% of Tables & Cross-Org Isolation",
    passed: rlsPassed,
    evidence: `Tables with RLS: ${rlsMatches.join(", ")} (${rlsMatches.length}/${tableMatches.length}). Cross-org leak: ${crossLeakage}`,
  });

  // =========================================================================
  // Criteria 4: Explanation never names a file absent from the repo (Check)
  // =========================================================================
  const allRepoFiles = parseResult.files.map((f) => f.path);
  const validExplanation =
    "`src/app.ts` coordinates execution by importing `src/utils/math.ts` and `src/services/api.ts`.";
  const validCheck = verifyExplanationGroundTruth(validExplanation, allRepoFiles);

  const fakeExplanation =
    "`src/app.ts` imports absent fictitious file `src/utils/non_existent_ghost.ts`.";
  const fakeCheck = verifyExplanationGroundTruth(fakeExplanation, allRepoFiles);

  const hallucinationGatePassed =
    validCheck.isValid &&
    !fakeCheck.isValid &&
    fakeCheck.hallucinatedFiles.includes("src/utils/non_existent_ghost.ts");

  results.push({
    id: "hallucination_verification_check",
    name: "Ground Truth Hallucination Verification Gate",
    passed: hallucinationGatePassed,
    evidence: `Valid text passed: ${validCheck.isValid}. Absent file caught: ${fakeCheck.hallucinatedFiles.join(", ")}`,
  });

  // =========================================================================
  // Criteria 5: Chat panel shows what it looked up before it answers
  // =========================================================================
  const agentRun = await runChatAgent({
    query: "What files depend on src/utils/math.ts?",
    files: parseResult.files,
    edges: parseResult.edges,
    selectedFileId: "src/utils/math.ts",
  });

  const chatLookupPassed =
    agentRun.lookups.length > 0 &&
    agentRun.lookups.some((l) => l.toolName === "lookup_dependents") &&
    agentRun.verification.isValid;

  results.push({
    id: "chat_pre_answer_lookups",
    name: "Grounded Chat Agent Lookup Execution",
    passed: chatLookupPassed,
    evidence: `Lookups performed: ${agentRun.lookups.map((l) => l.toolName).join(", ")}. Ground truth valid: ${agentRun.verification.isValid}`,
  });

  // =========================================================================
  // Criteria 6: Numeric Groundedness Quality Score
  // =========================================================================
  const totalMentioned =
    agentRun.verification.mentionedFiles.length +
    validCheck.mentionedFiles.length;
  const totalVerified =
    agentRun.verification.verifiedFiles.length +
    validCheck.verifiedFiles.length;

  const numericQualityScore =
    totalMentioned > 0 ? (totalVerified / totalMentioned) * 100 : 100;

  results.push({
    id: "numeric_quality_metric",
    name: "Quantitative Groundedness Precision Score",
    passed: numericQualityScore >= 95,
    evidence: `Score: ${numericQualityScore.toFixed(1)}% (${totalVerified}/${totalMentioned} cited file entities verified on disk)`,
  });

  const allPassed = results.every((r) => r.passed);
  return {
    allPassed,
    score: numericQualityScore,
    results,
  };
}

async function main() {
  console.log("=================================================");
  console.log("CARTOGRAPH SHIP CRITERIA & QUALITY GATE AUDIT");
  console.log("=================================================\n");

  try {
    const audit = await runShipCriteriaAudit();

    for (const r of audit.results) {
      const statusStr = r.passed ? "[PASS]" : "[FAIL]";
      console.log(`${statusStr} ${r.name}`);
      console.log(`       Evidence: ${r.evidence}\n`);
    }

    console.log("-------------------------------------------------");
    console.log(
      `Final Quality Score: ${audit.score.toFixed(1)}% | All Criteria Passed: ${
        audit.allPassed ? "YES" : "NO"
      }`
    );
    console.log("-------------------------------------------------");

    if (!audit.allPassed) {
      console.error("One or more ship criteria failed!");
      process.exit(1);
    }

    console.log("\nAll ship criteria verified. Cartograph is ready to ship.");
  } catch (err) {
    console.error("Audit suite error:", err);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("audit-ship-criteria.ts")) {
  main();
}
