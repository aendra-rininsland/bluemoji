import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    include: ["../lexicons"]
  },
  build: {
    outDir: "./dist",
    lib: {
      entry: {
        facet: "./src/facet/index.ts",
        render: "./src/render/index.ts",
        index: "./src/index.ts"
      },
      formats: ["es", "cjs"]
    }
  }
});
