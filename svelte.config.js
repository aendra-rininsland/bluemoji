import adapter from "@sveltejs/adapter-node";

export default {
  compilerOptions: {
    experimental: {
      async: true,
    },
  },
  kit: {
    adapter: adapter(),
    files: {
      src: "app",
    },
    alias: {
      $hatk: "./hatk.generated.ts",
      "$hatk/client": "./hatk.generated.client.ts",
    },
    experimental: {
      remoteFunctions: true,
    },
  },
};
