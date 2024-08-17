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
        render: "./src/render/index.ts"
      },
      formats: ["es", "cjs"]
    }
  }
});
