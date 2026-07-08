import { defineConfig } from "@hatk/hatk/config";

const isProd = process.env.NODE_ENV === "production";
const prodDomain = process.env.RAILWAY_PUBLIC_DOMAIN;

export default defineConfig({
  relay: isProd ? "wss://bsky.network" : "ws://localhost:2583",
  plc: isProd ? "https://plc.directory" : "http://localhost:2582",
  port: 3000,
  databaseEngine: "sqlite",
  database: isProd ? "/data/hatk.db" : "data/hatk.db",
  // Only index blue.moji.* — without this, hatk indexes every record lexicon
  // in lexicons/ (including vendored app.bsky.feed.postgate/threadgate/post)
  // and auto-backfills the full repo of every DID on the network that writes
  // one. app.bsky.feed.post is vendored (for PDS-proxied write validation by
  // the sticker composer) but deliberately absent here and from
  // signalCollections below — moji.blue writes posts, it doesn't index them.
  collections: [
    "blue.moji.collection.item",
    "blue.moji.packs.pack",
    "blue.moji.packs.packitem",
    "blue.moji.feed.reaction",
  ],
  backfill: {
    parallelism: 2,
    fullNetwork: false,
    signalCollections: [
      "blue.moji.collection.item",
      "blue.moji.packs.pack",
      "blue.moji.packs.packitem",
      "blue.moji.feed.reaction",
    ],
  },
  oauth: {
    issuer: isProd && prodDomain ? `https://${prodDomain}` : undefined,
    scopes: [
      "atproto",
      "repo:blue.moji.collection.item",
      "repo:blue.moji.packs.pack",
      "repo:blue.moji.packs.packitem",
      "repo:blue.moji.feed.reaction",
      "repo:app.bsky.feed.post",
      "blob",
    ],
    clients: [
      ...(prodDomain
        ? [
            {
              client_id: `https://${prodDomain}/oauth-client-metadata.json`,
              client_name: "moji.blue",
              scope:
                "atproto repo:blue.moji.collection.item repo:blue.moji.packs.pack repo:blue.moji.packs.packitem repo:blue.moji.feed.reaction repo:app.bsky.feed.post blob",
              redirect_uris: [
                `https://${prodDomain}/oauth/callback`,
                `https://${prodDomain}/admin`,
              ],
            },
          ]
        : []),
      {
        client_id: "http://127.0.0.1:3000/oauth-client-metadata.json",
        client_name: "bluemoji",
        scope:
          "atproto repo:blue.moji.collection.item repo:blue.moji.packs.pack repo:blue.moji.packs.packitem repo:blue.moji.feed.reaction repo:app.bsky.feed.post blob",
        redirect_uris: ["http://127.0.0.1:3000/oauth/callback"],
      },
    ],
  },
});
