import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      src: fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  esbuild: {
    jsx: "automatic"
  },
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true
  }
});
