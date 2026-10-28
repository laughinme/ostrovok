import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = `${root}src/shared/api/schema.d.ts`;
execFileSync(
  "npm",
  [
    "exec",
    "--yes",
    "--package=openapi-typescript@7.10.1",
    "--",
    "openapi-typescript",
    "openapi.json",
    "-o",
    output,
  ],
  { cwd: root, stdio: "inherit" },
);
const tree = ts.createSourceFile(
  output,
  readFileSync(output, "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
writeFileSync(output, ts.createPrinter({ removeComments: true }).printFile(tree));
execFileSync(`${root}node_modules/.bin/prettier`, ["--write", output], {
  cwd: root,
  stdio: "inherit",
});
