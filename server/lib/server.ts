/**
 * @file
 * XBlock Twitter Screenshot Blocker
 */
import { dbLogger, loggerMiddleware } from "./logger";
import cors from "cors";
import compression from "compression";
import { DAY, SECOND } from "@atproto/common";
import events from "events";
import express from "express";
import fs from "node:fs/promises";
import { FirehoseSubscription } from "./firehose";
import { db, migrateToLatest } from "./db";
import { isLoggedIn, agent } from "./agent";
import { createServer } from "../lexicons";
import feedGeneration from "./routes/feed-generation";
import { IdResolver, DidCache, MemoryCache } from "@atproto/identity";
import describeGenerator from "./routes/describe-generator";
import { AppContext, Config } from "./config";
import wellKnown from "./well-known";
import serveBlobs from "./routes/blob";
import { AuthVerifier } from "./auth-verifier";
import oAuth from "./routes/oauth";
import next from "next";

const isProduction = process.env.NODE_ENV === "production";

const base = process.env.BASE || "/";

export async function main(cfg: Config) {
  const dev = process.env.NODE_ENV !== "production";

  // frontend
  const frontend = next({ dev });
  const frontendHandler = frontend.getRequestHandler();
  await frontend.prepare();

  // backend
  const firehose = new FirehoseSubscription("wss://bsky.network", db, agent);
  const app = express();
  const didCache = new MemoryCache();
  const didResolver = new IdResolver({
    plcUrl: "https://plc.directory",
    didCache
  });
  const server = createServer({
    validateResponse: true,
    payload: {
      jsonLimit: 100 * 1024, // 100kb
      textLimit: 100 * 1024, // 100kb
      blobLimit: 5 * 1024 * 1024 // 5mb
    }
  });

  const authVerifier = new AuthVerifier(didResolver);

  const ctx: AppContext = {
    db,
    didResolver,
    cfg,
    authVerifier
  };

  app.set("trust proxy", true);
  app.use(cors({ maxAge: DAY / SECOND }));
  app.use(loggerMiddleware);
  app.use(compression());

  feedGeneration(server, ctx);
  describeGenerator(server, ctx);

  app.use(server.xrpc.router);
  app.use(wellKnown(ctx));
  app.use(serveBlobs(ctx));
  app.use(await oAuth(ctx));
  app.get("*", (req, res) => frontendHandler(req, res));

  return {
    server,
    ctx,
    cfg,
    start: async () => {
      await migrateToLatest(db);
      await isLoggedIn;

      firehose.run(cfg.subscriptionReconnectDelay);

      const s = app.listen(cfg.port, cfg.listenhost);
      await events.once(s, "listening");
      console.info("Running...");
      return { server: s, app, ctx };
    }
  };
}
