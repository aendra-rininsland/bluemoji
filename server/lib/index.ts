import dotenv from "dotenv";
import { main } from "./server";

const maybeStr = (val?: string) => {
  if (!val) return undefined;
  return val;
};

const maybeInt = (val?: string) => {
  if (!val) return undefined;
  const int = parseInt(val, 10);
  if (isNaN(int)) return undefined;
  return int;
};

void (async function () {
  dotenv.config();
  const hostname = maybeStr(process.env.APPVIEW_HOSTNAME) ?? "example.com";
  const serviceDid =
    maybeStr(process.env.APPVIEW_SERVICE_DID) ?? `did:web:${hostname}`;
  const server = await main({
    port: maybeInt(process.env.APPVIEW_PORT) ?? 5577,
    listenhost: maybeStr(process.env.APPVIEW_LISTENHOST) ?? "0.0.0.0",
    sqliteLocation: maybeStr(process.env.APPVIEW_SQLITE_LOCATION) ?? ":memory:",
    subscriptionEndpoint:
      maybeStr(process.env.APPVIEW_SUBSCRIPTION_ENDPOINT) ??
      "wss://bsky.network",
    publisherDid:
      maybeStr(process.env.APPVIEW_PUBLISHER_DID) ?? "did:example:alice",
    subscriptionReconnectDelay:
      maybeInt(process.env.APPVIEW_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    hostname,
    serviceDid,
    service: { version: "v0-prerelease" }
  });

  await server.start();
  console.log(
    `🤖 running feed generator at http://${server.cfg.listenhost}:${server.cfg.port}`
  );
})();

process.on("SIGTERM", () => {
  process.exit(0);
});
