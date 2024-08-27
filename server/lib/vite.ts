import fs from "node:fs/promises";
import express from "express";
import { ViteDevServer } from "vite";

// Constants
const isProduction = process.env.NODE_ENV === "production";
const base = process.env.BASE || "/";

export const makeRouter = async () => {
  // Cached production assets
  const templateHtml = isProduction
    ? await fs.readFile("./dist/client/index.html", "utf-8")
    : "";
  const ssrManifest = isProduction
    ? await fs.readFile("./dist/client/.vite/ssr-manifest.json", "utf-8")
    : undefined;
  const router = express.Router();
  // Add Vite or respective production middlewares
  let vite: ViteDevServer;
  if (!isProduction) {
    const { createServer } = await import("vite");
    vite = await createServer({
      server: { middlewareMode: true },
      appType: "mpa",
      base
    });
    router.use(vite.middlewares);
  } else {
    const compression = (await import("compression")).default;
    const sirv = (await import("sirv")).default;
    router.use(compression());
    router.use(base, sirv("./dist/client", { extensions: [] }));
  }

  // Serve HTML
  router.use("*", async (req, res) => {
    try {
      const url = req.originalUrl.replace(base, "");

      let template;
      let render;
      if (!isProduction) {
        // Always read fresh template in development
        template = await fs.readFile("./index.html", "utf-8");
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule("/lib/app/entry-server.tsx")).render;
      } else {
        template = templateHtml;
        render = (await import("./app/entry-server.ts")).render;
        // render = (await import("../dist/server/entry-server.mjs")).render; // ??
      }

      const rendered = await render(url, ssrManifest);

      const html = template
        .replace(`<!--app-head-->`, rendered.head ?? "")
        .replace(`<!--app-html-->`, rendered.html ?? "");

      res.status(200).set({ "Content-Type": "text/html" }).send(html);
    } catch (e: unknown) {
      if (e instanceof Error) {
        vite?.ssrFixStacktrace(e);
        console.log(e.stack);
        res.status(500).end(e.stack);
      }
    }
  });

  return router;
};
