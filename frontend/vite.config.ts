import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({
      router: {
        entry: "app/router/index",
        routesDirectory: "app/routes",
        generatedRouteTree: "../.tanstack/route-tree.gen.ts",
        routeTreeFileHeader: [],
        quoteStyle: "double",
        semicolons: true,
      },
    }),
    nitro({ preset: "node-server" }),
    react(),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5173 },
});
