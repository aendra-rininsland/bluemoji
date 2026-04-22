import { sveltekit } from "@sveltejs/kit/vite";
import { hatk } from "@hatk/hatk/vite-plugin";
import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  plugins: [hatk(), sveltekit()],
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/browser/**"],
  },
  lint: {
    ignorePatterns: ["hatk.generated.ts", "hatk.generated.client.ts"],
  },
  fmt: {
    ignorePatterns: ["hatk.generated.ts", "hatk.generated.client.ts"],
  },
});
