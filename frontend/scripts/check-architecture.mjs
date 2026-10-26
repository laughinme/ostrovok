import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { projectRoot, sourceFiles } from "./source-files.mjs";

const sourceRoot = join(projectRoot, "src");
const layers = ["app", "pages", "widgets", "features", "entities", "shared"];

export function importViolation(importer, specifier) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;
  const source = importer.split("/");
  const targetPath = specifier.startsWith("@/")
    ? resolve(sourceRoot, specifier.slice(2))
    : resolve(sourceRoot, dirname(importer), specifier);
  const target = relative(sourceRoot, targetPath).split(sep);
  if (target[0] === "..") {
    return source[0] === "app" && target[1] === ".tanstack"
      ? null
      : "imports must remain inside src";
  }
  const sourceRank = layers.indexOf(source[0]);
  const targetRank = layers.indexOf(target[0]);
  if (sourceRank < 0 || targetRank < 0) return "unknown FSD layer";
  if (targetRank < sourceRank) return "cannot import a higher layer";
  const sameSlice = sourceRank === targetRank && source[1] === target[1];
  if (sourceRank === targetRank && !sameSlice && !["app", "shared"].includes(source[0])) {
    return "cannot import a sibling slice";
  }
  if (sameSlice || (source[0] === "app" && target[0] === "app")) return null;
  if (target[0] === "shared" && target[1] === "assets") return null;
  const suffix = target.slice(2).join("/");
  if (suffix && !/^index\.(ts|tsx|js|mjs)$/.test(suffix) && suffix !== "index") {
    return "use the public API of the slice or segment";
  }
  return null;
}

export function importSpecifiers(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const specifiers = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return specifiers;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = sourceFiles().filter((file) => file.startsWith(`${sourceRoot}${sep}`));
  const violations = [];
  for (const file of files) {
    const importer = relative(sourceRoot, file).split(sep).join("/");
    for (const specifier of importSpecifiers(file, readFileSync(file, "utf8"))) {
      const violation = importViolation(importer, specifier);
      if (violation) violations.push(`${importer}: ${specifier}: ${violation}`);
    }
  }
  if (violations.length) {
    console.error(violations.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`FSD boundaries and public APIs verified in ${files.length} source files.`);
  }
}
