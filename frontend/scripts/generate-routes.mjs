import { fileURLToPath } from "node:url";
import { Generator, getConfig } from "@tanstack/router-generator";
const root = fileURLToPath(new URL("..", import.meta.url));
const config = getConfig(
  {
    routesDirectory: "./src/app/routes",
    generatedRouteTree: "./.tanstack/route-tree.gen.ts",
    routeTreeFileHeader: [],
    quoteStyle: "double",
    semicolons: true,
    routeTreeFileFooter: [
      'import type { getRouter } from "../src/app/router/index.tsx"',
      'import type {} from "@tanstack/react-start"',
      'declare module "@tanstack/react-start" { interface Register { ssr: true; router: Awaited<ReturnType<typeof getRouter>> } }',
    ],
  },
  root,
);
await new Generator({ config, root }).run();
