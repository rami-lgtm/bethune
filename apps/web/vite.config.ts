import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 4000,
    watch: {
      ignored: [
        "**/routeTree.gen.ts",
        path.resolve(__dirname, "src/routeTree.gen.ts"),
      ],
    },
  },
  build: {
    sourcemap: process.env.NODE_ENV !== "production",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@convex": path.resolve(__dirname, "../../convex"),
    },
    dedupe: ["convex"],
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      tsr: {
        appDirectory: "src",
        autoCodeSplitting: true,
        disableLogging: true,
        enableRouteGeneration: false,
      },
    }),
    nitro(),
    tailwindcss(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
  ],
});
