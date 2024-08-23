/**
 * @file
 * XBlock Twitter Screenshot Blocker
 */
import { loggerMiddleware } from "./logger";
import cors from "cors";
import compression from "compression";
import { DAY, SECOND } from "@atproto/common";
import events from "events";
import express from "express";
import { FirehoseSubscription } from "./firehose";
import { db, migrateToLatest } from "./db";
import { isLoggedIn, agent } from "./agent";
import { createServer } from "../lexicons";
import feedGeneration from "./routes/feed-generation";
import { IdResolver, MemoryCache } from "@atproto/identity";
import describeGenerator from "./routes/describe-generator";
import { AppContext, Config } from "./config";
import wellKnown from "./well-known";
import serveBlobs from "./routes/blob";
import { AuthVerifier } from "./auth-verifier";
import OAuth from "./routes/oauth";
import * as vite from "./vite";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

export async function main(cfg: Config) {
  dotenv.config();

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
  app.use(cookieParser());
  app.use(compression());

  feedGeneration(server, ctx);
  describeGenerator(server, ctx);

  app.use(server.xrpc.router);
  app.use(wellKnown(ctx));
  app.use(serveBlobs(ctx));
  app.use(await OAuth(ctx));
  app.use(await vite.makeRouter());

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
