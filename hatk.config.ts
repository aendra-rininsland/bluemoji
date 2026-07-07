import { defineConfig } from "@hatk/hatk/config";

const isProd = process.env.NODE_ENV === "production";
const prodDomain = process.env.RAILWAY_PUBLIC_DOMAIN;

export default defineConfig({
  relay: isProd ? "wss://bsky.network" : "ws://localhost:2583",
  plc: isProd ? "https://plc.directory" : "http://localhost:2582",
  port: 3000,
  databaseEngine: "sqlite",
  database: isProd ? "/data/hatk.db" : "data/hatk.db",
  backfill: {
    parallelism: 5,
    fullNetwork: false,
  },
  oauth: {
    issuer: isProd && prodDomain ? `https://${prodDomain}` : undefined,
    scopes: ["atproto", "repo:blue.moji.collection.item", "blob"],
    clients: [
      ...(prodDomain
        ? [
            {
              client_id: `https://${prodDomain}/oauth-client-metadata.json`,
              client_name: "moji.blue",
              scope: "atproto repo:blue.moji.collection.item blob",
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
        scope: "atproto repo:blue.moji.collection.item blob",
        redirect_uris: ["http://127.0.0.1:3000/oauth/callback"],
      },
    ],
  },
});
