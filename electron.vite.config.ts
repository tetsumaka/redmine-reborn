import { defineConfig } from "electron-vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const fromRoot = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  main: {
    build: { outDir: "dist/main", externalizeDeps: true, lib: { entry: fromRoot("./electron/main.ts"), formats: ["cjs"] } },
  },
  preload: {
    build: { outDir: "dist/preload", externalizeDeps: true, lib: { entry: fromRoot("./electron/preload.ts"), formats: ["cjs"] } },
  },
  renderer: {
    root: ".", base: "./", plugins: [tailwindcss()],
    resolve: { alias: { src: fromRoot("./src") } },
    esbuild: { jsx: "automatic" },
    server: {
      host: "127.0.0.1", port: 5173, strictPort: true, open: false,
      watch: { ignored: ["**/.npm-cache/**", "**/release/**", "**/dist/**"] },
    },
    build: { outDir: "dist/renderer", minify: "esbuild", rollupOptions: { input: fromRoot("./index.html") } },
  },
});
