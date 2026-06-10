import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsConfigPaths(), viteReact(), tailwindcss()],
  build: {
    emptyOutDir: true,
    outDir: "dist/github-pages",
    rollupOptions: {
      input: "src/github-pages-entry.tsx",
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  resolve: {
    dedupe: ["@tanstack/react-router", "react", "react-dom"],
  },
});
