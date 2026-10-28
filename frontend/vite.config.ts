import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const backendUrl = (
    process.env["BACKEND_URL"] ??
    loadEnv(mode, process.cwd(), "BACKEND_URL")["BACKEND_URL"] ??
    "https://okno-api.fly.dev"
  ).replace(/\/$/, "");
  process.env["BACKEND_URL"] = backendUrl;
  return {
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
      nitro({
        preset: process.env["VERCEL"] ? "vercel" : "node-server",
        routeRules: {
          "/api/**": { proxy: `${backendUrl}/api/**` },
          "/health": { proxy: `${backendUrl}/health` },
        },
      }),
      react(),
    ],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: { port: 5173 },
  };
});
