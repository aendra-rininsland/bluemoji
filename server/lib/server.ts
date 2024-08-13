/**
 * @file
 * XBlock Twitter Screenshot Blocker
 */
import events from "events";
import express from "express";
import { FirehoseSubscription } from "./firehose";
import { db, migrateToLatest } from "./db";
import { isLoggedIn, agent } from "./agent";
import { createServer } from "@aendra/lexicons";
import feedGeneration from "./methods/feed-generation";
import { DidResolver, MemoryCache } from "@atproto/identity";
import describeGenerator from "./methods/describe-generator";
import { AppContext, Config } from "./config";
import wellKnown from "./well-known";
import serveBlobs from "./methods/blob";

export async function main(cfg: Config) {
  const firehose = new FirehoseSubscription("wss://bsky.network", db, agent);

  const app = express();
  const didCache = new MemoryCache();
  const didResolver = new DidResolver({
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

  const ctx: AppContext = {
    db,
    didResolver,
    cfg
  };
  feedGeneration(server, ctx);
  describeGenerator(server, ctx);
  app.use(server.xrpc.router);
  app.use(wellKnown(ctx));
  app.use(serveBlobs(ctx));

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
