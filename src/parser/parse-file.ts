import { Project, SyntaxKind, type SourceFile } from "ts-morph";
import type { RawImport } from "./types";

/**
 * Extracts all imports, re-exports, dynamic imports, and CommonJS require() calls
 * from a TypeScript or JavaScript source file AST.
 */
export function extractRawImports(sourceFile: SourceFile): RawImport[] {
  const imports: RawImport[] = [];

  // 1. Static import declarations: import { x } from './y'
  const importDecls = sourceFile.getImportDeclarations();
  for (const decl of importDecls) {
    const specifier = decl.getModuleSpecifierValue();
    if (!specifier) continue;

    const line = decl.getStartLineNumber();
    const isTypeOnly = decl.isTypeOnly();

    imports.push({
      specifier,
      kind: "static-import",
      line,
      isTypeOnly,
    });
  }

  // 2. Re-exports with module specifiers: export { x } from './y' or export * from './y'
  const exportDecls = sourceFile.getExportDeclarations();
  for (const decl of exportDecls) {
    const specifier = decl.getModuleSpecifierValue();
    if (!specifier) continue;

    const line = decl.getStartLineNumber();
    const isTypeOnly = decl.isTypeOnly();

    imports.push({
      specifier,
      kind: "re-export",
      line,
      isTypeOnly,
    });
  }

  // 3. Dynamic imports: import('./dynamic-module') and require('commonjs-module')
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const callExpr of callExpressions) {
    const expression = callExpr.getExpression();
    const line = callExpr.getStartLineNumber();

    // Dynamic import: import(...)
    if (expression.getKind() === SyntaxKind.ImportKeyword) {
      const args = callExpr.getArguments();
      if (args.length > 0) {
        const firstArg = args[0];
        if (firstArg.getKind() === SyntaxKind.StringLiteral) {
          const specifier = firstArg.getText().slice(1, -1);
          imports.push({
            specifier,
            kind: "dynamic-import",
            line,
            isTypeOnly: false,
          });
        }
      }
    }

    // CommonJS require: require(...)
    if (expression.getText() === "require") {
      const args = callExpr.getArguments();
      if (args.length > 0) {
        const firstArg = args[0];
        if (firstArg.getKind() === SyntaxKind.StringLiteral) {
          const specifier = firstArg.getText().slice(1, -1);
          imports.push({
            specifier,
            kind: "require",
            line,
            isTypeOnly: false,
          });
        }
      }
    }
  }

  return imports;
}

/**
 * Creates a standalone ts-morph project configured in memory to avoid generating files.
 */
export function createParserProject(): Project {
  return new Project({
    useInMemoryFileSystem: false,
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      noEmit: true,
    },
    skipAddingFilesFromTsConfig: true,
  });
}
