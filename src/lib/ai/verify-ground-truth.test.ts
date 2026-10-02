import { verifyExplanationGroundTruth } from "./hallucination-checker";

function runTests() {
  console.log("Running Ground Truth Hallucination Verification Tests...\n");

  const knownFiles = [
    "src/index.ts",
    "src/app.ts",
    "src/utils/math.ts",
    "src/utils/format.ts",
    "src/services/api.ts",
  ];

  // Test 1: Valid explanation strictly referencing existing files
  const validText =
    "`src/app.ts` coordinates execution by importing `src/utils/math.ts` and calling `api.ts`.";
  const result1 = verifyExplanationGroundTruth(validText, knownFiles);

  if (result1.isValid && result1.hallucinatedFiles.length === 0) {
    console.log("PASS: Valid explanation correctly approved.");
  } else {
    console.error("FAIL: Valid explanation was incorrectly flagged:", result1);
    process.exit(1);
  }

  // Test 2: Hallucinated explanation referencing a non-existent file
  const hallucinatedText =
    "`src/app.ts` imports `src/utils/math.ts` and delegates to `src/utils/ghost-helper.ts`.";
  const result2 = verifyExplanationGroundTruth(hallucinatedText, knownFiles);

  if (!result2.isValid && result2.hallucinatedFiles.includes("src/utils/ghost-helper.ts")) {
    console.log(
      `PASS: Hallucinated file correctly caught and flagged: ${result2.hallucinatedFiles.join(", ")}`
    );
  } else {
    console.error("FAIL: Absent file was not caught by verification check:", result2);
    process.exit(1);
  }

  console.log("\nAll Ground Truth Verification tests passed successfully!");
}

runTests();
