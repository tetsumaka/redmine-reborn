import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const alias = {
  src: fromRoot("./src")
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias
    },
    build: {
      outDir: "dist/main",
      lib: {
        entry: fromRoot("./src/main/main.ts"),
        formats: ["cjs"],
        fileName: () => "main.js"
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias
    },
    build: {
      outDir: "dist/main",
      emptyOutDir: false,
      lib: {
        entry: fromRoot("./src/main/preload.ts"),
        formats: ["cjs"],
        fileName: () => "preload.js"
      }
    }
  },
  renderer: {
    root: ".",
    base: "./",
    plugins: [tailwindcss()],
    resolve: {
      alias
    },
    esbuild: {
      jsx: "automatic"
    },
    server: {
      open: false
    },
    build: {
      outDir: "dist/renderer",
      rollupOptions: {
        input: fromRoot("./index.html")
      }
    }
  }
});
