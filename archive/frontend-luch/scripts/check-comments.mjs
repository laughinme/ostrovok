import { readFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tseslint from "typescript-eslint";
import { projectRoot, sourceFiles } from "./source-files.mjs";

export function findComments(file, source) {
  if (extname(file) === ".css") {
    const comments = [];
    postcss.parse(source, { from: file }).walkComments((comment) => {
      comments.push({ line: comment.source.start.line });
    });
    return comments;
  }
  const { ast } = tseslint.parser.parseForESLint(source, {
    filePath: file,
    sourceType: "module",
    comment: true,
    loc: true,
    range: true,
  });
  return (ast.comments ?? []).map((comment) => ({
    line: comment.loc.start.line,
    range: comment.range,
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = sourceFiles();
  const violations = files.flatMap((file) =>
    findComments(file, readFileSync(file, "utf8")).map(
      (comment) => `${relative(projectRoot, file)}:${comment.line}`,
    ),
  );
  if (violations.length) {
    console.error(`Comments found:\n${violations.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`No comments in ${files.length} source files.`);
  }
}
