import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";

// Library-mode build producing three entry points, matching the package's
// public import surface: the unified root (facet + render + alias helpers),
// plus the two standalone subpaths that existed pre-rewrite
// (@aendra/bluemoji/facet, @aendra/bluemoji/render) so existing consumers of
// those subpaths keep working. ESM only — the previously-published package's
// "require" condition already pointed at .cjs files that were never actually
// built, so there is no real CJS contract to preserve.
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: "./tsconfig.json",
      outDir: "dist/types",
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        facet: resolve(__dirname, "src/facet/index.ts"),
        render: resolve(__dirname, "src/render/index.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // Never bundle dependencies into the published package.
      external: [
        "@atproto/api",
        "@atproto/api/src/rich-text/detection",
        "@atproto/api/src/rich-text/unicode",
        "@atproto/lexicon",
        "@atproto/xrpc",
        "@dotlottie/dotlottie-js",
        "@lottiefiles/dotlottie-react",
        "@lottiefiles/dotlottie-web",
        "lottie-react-native",
        "multiformats/cid",
        "react",
        "react-native",
        "upng-js",
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
