#!/usr/bin/env node
import path from "node:path";
import { parseDirectory } from "./parse-directory";
import { calculateAllMetrics } from "../graph/calculations";

async function main() {
  const targetArg = process.argv[2] || ".";
  const targetDir = path.resolve(process.cwd(), targetArg);

  console.log(`[Cartograph Parser] Parsing directory: ${targetDir}`);
  const startTime = Date.now();

  try {
    const result = await parseDirectory(targetDir);
    const durationMs = Date.now() - startTime;
    const metrics = calculateAllMetrics(result.files, result.edges);

    console.log(`\n========================================`);
    console.log(`PARSE SUMMARY (${durationMs}ms)`);
    console.log(`========================================`);
    console.log(`Root:                     ${result.rootPath}`);
    console.log(`Total Encountered Files:  ${result.coverage.totalEncounteredFiles}`);
    console.log(`Parsed Code Files:        ${result.files.length}`);
    console.log(`Resolved Internal Edges:  ${result.edges.length}`);
    console.log(`External Dependencies:    ${result.coverage.externalDependenciesCount}`);
    console.log(`Unresolved Imports:       ${result.coverage.unresolvedImportsCount}`);
    console.log(`Skipped Files:            ${result.coverage.skippedFilesCount}`);

    console.log(`\n--- Parsed Files Sample (up to 10) ---`);
    for (const file of result.files.slice(0, 10)) {
      const fileMetric = metrics.get(file.path) || { fanIn: 0, fanOut: 0 };
      console.log(
        `  ${file.path} [in: ${fileMetric.fanIn}, out: ${fileMetric.fanOut}, rawImports: ${file.rawImports.length}]`
      );
    }

    if (result.edges.length > 0) {
      console.log(`\n--- Resolved Edges Sample (up to 10) ---`);
      for (const edge of result.edges.slice(0, 10)) {
        console.log(`  ${edge.from} -> ${edge.to} (${edge.kind})`);
      }
    }

    if (result.coverage.unresolvedImportsCount > 0) {
      console.log(`\n--- Unresolved Internal Imports ---`);
      const unresolvedInternal = result.coverage.unresolvedImports.filter((u) => !u.isExternal);
      for (const u of unresolvedInternal.slice(0, 10)) {
        console.log(`  ${u.file}:${u.line} -> "${u.specifier}" [Reason: ${u.reason}]`);
      }
    }

    console.log(`\nParser completed successfully.`);
  } catch (err) {
    console.error(`Parser error:`, err);
    process.exit(1);
  }
}

main();
