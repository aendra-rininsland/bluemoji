import assert from "node:assert/strict";
import test from "node:test";
import { CloudflarePurger, getItemUrls, imgUrls, purgeConfigFromEnv } from "./_cache-purge.ts";

const ORIGIN = "https://moji.blue";
const DID = "did:plc:abc";

test("disabled unless zone, token and origin are all set", () => {
  assert.equal(purgeConfigFromEnv({}), null);
  assert.equal(purgeConfigFromEnv({ CLOUDFLARE_ZONE_ID: "z", CLOUDFLARE_API_TOKEN: "t" }), null);
  const cfg = purgeConfigFromEnv({
    CLOUDFLARE_ZONE_ID: "z",
    CLOUDFLARE_API_TOKEN: "t",
    RAILWAY_PUBLIC_DOMAIN: "moji.blue",
  });
  assert.equal(cfg?.origin, "https://moji.blue");
  assert.equal(cfg?.batchSize, 30);
});

test("getItem URLs cover encoded and raw colons, both param orders, DID and handle", () => {
  const urls = getItemUrls(ORIGIN, [DID, "alice.test"], ":Blob-Cat:");
  const has = (u: string) => assert.ok(urls.includes(u), `missing ${u}`);
  const base = `${ORIGIN}/xrpc/blue.moji.collection.getItem`;
  has(`${base}?repo=did%3Aplc%3Aabc&name=%3Ablob-cat%3A`);
  has(`${base}?repo=did:plc:abc&name=:blob-cat:`);
  has(`${base}?name=%3Ablob-cat%3A&repo=did%3Aplc%3Aabc`);
  has(`${base}?repo=alice.test&name=blob-cat`);
  assert.equal(new Set(urls).size, urls.length, "no duplicates");
});

test("non-ASCII aliases are percent-encoded", () => {
  const urls = getItemUrls(ORIGIN, [DID], ":日本語:");
  assert.ok(urls.some((u) => u.includes("name=%3A%E6%97%A5%E6%9C%AC%E8%AA%9E%3A")));
});

test("rejects an invalid alias rather than purging nonsense", () => {
  assert.throws(() => getItemUrls(ORIGIN, [DID], "has space"));
});

function fakeFetch(statuses: number[]) {
  const calls: { files: string[]; auth: string | null }[] = [];
  const fn = (async (_url: string, init: RequestInit) => {
    calls.push({
      files: JSON.parse(init.body as string).files,
      auth: (init.headers as Record<string, string>).authorization,
    });
    const status = statuses.shift() ?? 200;
    return new Response("{}", { status, headers: status === 429 ? { "retry-after": "1" } : {} });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const config = {
  zoneId: "z",
  apiToken: "secret",
  origin: ORIGIN,
  batchSize: 3,
  minIntervalMs: 0,
};

test("batches URLs and authenticates", async () => {
  const { fn, calls } = fakeFetch([]);
  const p = new CloudflarePurger(config, { fetch: fn, sleep: async () => {}, log: () => {} });
  p.enqueue(["a", "b", "c", "d", "e"]);
  await p.idle();
  assert.deepEqual(
    calls.map((c) => c.files.length),
    [3, 2],
  );
  assert.equal(calls[0].auth, "Bearer secret");
  assert.equal(p.purged, 5);
});

test("de-duplicates queued URLs", async () => {
  const { fn, calls } = fakeFetch([]);
  const p = new CloudflarePurger(config, { fetch: fn, sleep: async () => {}, log: () => {} });
  p.enqueue(["a", "a", "b"]);
  await p.idle();
  assert.equal(calls[0].files.length, 2);
});

test("retries when rate limited, and gives up on a rejected token", async () => {
  const slept: number[] = [];
  const limited = fakeFetch([429, 200]);
  const a = new CloudflarePurger(config, {
    fetch: limited.fn,
    sleep: async (ms) => void slept.push(ms),
    log: () => {},
  });
  a.enqueue(["x"]);
  await a.idle();
  assert.equal(limited.calls.length, 2);
  assert.equal(a.purged, 1);
  assert.deepEqual(slept, [1000]);

  const denied = fakeFetch([403, 200]);
  const b = new CloudflarePurger(config, {
    fetch: denied.fn,
    sleep: async () => {},
    log: () => {},
  });
  b.enqueue(["x"]);
  await b.idle();
  assert.equal(denied.calls.length, 1, "403 is not retried");
  assert.equal(b.failed, 1);
});

test("never throws when the network is down", async () => {
  const p = new CloudflarePurger(config, {
    fetch: (async () => {
      throw new Error("offline");
    }) as typeof fetch,
    sleep: async () => {},
    log: () => {},
  });
  p.enqueue(["x"]);
  await p.idle();
  assert.equal(p.failed, 1);
});

test("does nothing when not configured", async () => {
  const p = new CloudflarePurger(null);
  p.enqueue(["x"]);
  await p.idle();
  assert.equal(p.enabled, false);
  assert.equal(p.purged + p.failed, 0);
});

test("image URLs cover the encoded and raw-colon spellings of the DID", () => {
  const cid = "bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  assert.deepEqual(imgUrls(ORIGIN, DID, cid), [
    `${ORIGIN}/img/${encodeURIComponent(DID)}/${cid}`,
    `${ORIGIN}/img/${DID}/${cid}`,
  ]);
  assert.ok(imgUrls(ORIGIN, DID, cid)[0].includes("%3A"), "matches what the app's imgUrl() emits");
});
