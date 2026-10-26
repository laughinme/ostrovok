import { readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css"]);

export function sourceFiles() {
  const result = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (extensions.has(extname(path))) result.push(path);
    }
  };
  for (const directory of ["src", "scripts", "tests"]) visit(join(projectRoot, directory));
  for (const entry of readdirSync(projectRoot, { withFileTypes: true })) {
    if (entry.isFile() && extensions.has(extname(entry.name))) {
      result.push(join(projectRoot, entry.name));
    }
  }
  return result.sort();
}
