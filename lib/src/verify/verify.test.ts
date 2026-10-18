import test from "node:test";
import assert from "node:assert";
import { verifyEmojiClaim } from "./index";

const DID = "did:plc:abcdefghijklmnopqrstuvwx";
const PDS = "https://pds.example";
const record = (name = ":blobcat:") => ({
  $type: "blue.moji.collection.item",
  name,
  alt: "a cat",
  createdAt: "2026-01-01T00:00:00.000Z",
  adultOnly: false,
  formats: {
    $type: "blue.moji.collection.item#formats_v1",
    png_128: { ref: { $link: "bafkreiaaa" } },
  },
});

type Handler = (url: URL) => Response | undefined;
function net(handlers: Record<string, Handler>) {
  const seen: string[] = [];
  const fetch = (async (input: any) => {
    const url = new URL(String(input));
    seen.push(`${url.origin}${url.pathname}`);
    const h = handlers[url.origin];
    return h?.(url) ?? new Response("{}", { status: 404 });
  }) as typeof globalThis.fetch;
  return { fetch, seen };
}
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
const plc = (): Handler => () =>
  json({ service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: PDS }] });
const pds =
  (value: unknown = record()): Handler =>
  (url) =>
    url.pathname.endsWith("getRecord") && url.searchParams.get("rkey") === "blobcat"
      ? json({ uri: `at://${DID}/blue.moji.collection.item/blobcat`, cid: "bafyreirec", value })
      : undefined;
const appview =
  (item: unknown, status = 200): Handler =>
  () =>
    status === 200 ? json({ uri: "at://x", item }) : json({ error: "NotFound" }, status);
const view = (over: object = {}) => ({
  did: DID,
  name: ":blobcat:",
  formats: {},
  adultOnly: false,
  ...over,
});

test("reads straight from the owner's PDS by default, with no AppView configured", async () => {
  const n = net({ "https://plc.directory": plc(), [PDS]: pds() });
  const r = await verifyEmojiClaim({ did: DID, name: ":blobcat:" }, { fetch: n.fetch });
  assert.equal(r?.via, "pds");
  assert.equal(r?.moderated, false);
  assert.equal(r?.item.name, ":blobcat:");
  assert.equal(r?.item.did, DID);
  assert.equal(r?.item.alt, "a cat");
  assert.equal(r?.item.cid, "bafyreirec");
  assert.ok(n.seen.every((u) => u.startsWith("https://plc.directory") || u.startsWith(PDS)));
});

test("an AppView answer is used, in the order given, and the PDS is not asked", async () => {
  const n = net({
    "https://a.example": appview(view({ alt: "from a" })),
    "https://b.example": appview(view()),
  });
  const r = await verifyEmojiClaim(
    { did: DID, name: "blobcat" },
    { fetch: n.fetch, appviews: ["https://a.example", "https://b.example"] },
  );
  assert.equal(r?.via, "appview");
  assert.equal(r?.appview, "https://a.example");
  assert.equal(r?.moderated, true);
  assert.equal(r?.item.alt, "from a");
  assert.equal(n.seen.length, 1);
});

test("an AppView that is down is skipped; the next source answers", async () => {
  const n = net({
    "https://down.example": () => new Response("boom", { status: 503 }),
    "https://b.example": appview(view({ alt: "from b" })),
  });
  const r = await verifyEmojiClaim(
    { did: DID, name: ":blobcat:" },
    { fetch: n.fetch, appviews: ["https://down.example", "https://b.example"] },
  );
  assert.equal(r?.appview, "https://b.example");
  const n2 = net({
    "https://down.example": () => new Response("x", { status: 500 }),
    "https://plc.directory": plc(),
    [PDS]: pds(),
  });
  const r2 = await verifyEmojiClaim(
    { did: DID, name: ":blobcat:" },
    { fetch: n2.fetch, appviews: ["https://down.example"] },
  );
  assert.equal(r2?.via, "pds", "falls back to the PDS when every AppView is unavailable");
});

test("an AppView saying not found is final: a takedown is not undone by the PDS", async () => {
  const n = net({
    "https://a.example": appview(null, 404),
    "https://plc.directory": plc(),
    [PDS]: pds(),
  });
  const r = await verifyEmojiClaim(
    { did: DID, name: ":blobcat:" },
    { fetch: n.fetch, appviews: ["https://a.example"] },
  );
  assert.equal(r, null);
  assert.ok(!n.seen.some((u) => u.startsWith(PDS)), "the PDS was never asked");
});

test("an AppView cannot substitute a different emoji for the one claimed", async () => {
  const n = net({
    "https://liar.example": appview(view({ name: ":other:" })),
    "https://plc.directory": plc(),
    [PDS]: pds(),
  });
  const r = await verifyEmojiClaim(
    { did: DID, name: ":blobcat:" },
    { fetch: n.fetch, appviews: ["https://liar.example"] },
  );
  assert.equal(r?.via, "pds", "a mismatched answer is treated as a failure");
  const n2 = net({
    "https://liar.example": appview(view({ did: "did:plc:zzzzzzzzzzzzzzzzzzzzzzzz" })),
    "https://plc.directory": plc(),
    [PDS]: pds(),
  });
  const r2 = await verifyEmojiClaim(
    { did: DID, name: ":blobcat:" },
    { fetch: n2.fetch, appviews: ["https://liar.example"] },
  );
  assert.equal(r2?.via, "pds");
});

test("a local index wins, and null from it is final", async () => {
  const n = net({});
  const hit = await verifyEmojiClaim(
    { did: DID, name: ":blobcat:" },
    { fetch: n.fetch, index: async () => view() as any },
  );
  assert.equal(hit?.via, "index");
  const miss = await verifyEmojiClaim(
    { did: DID, name: ":blobcat:" },
    { fetch: n.fetch, index: async () => null },
  );
  assert.equal(miss, null);
  const unknown = net({ "https://plc.directory": plc(), [PDS]: pds() });
  const r = await verifyEmojiClaim(
    { did: DID, name: ":blobcat:" },
    { fetch: unknown.fetch, index: async () => undefined },
  );
  assert.equal(r?.via, "pds", "undefined means the index doesn't know");
  assert.equal(n.seen.length, 0);
});

test("direct can be turned off", async () => {
  const n = net({ "https://plc.directory": plc(), [PDS]: pds() });
  assert.equal(
    await verifyEmojiClaim({ did: DID, name: ":blobcat:" }, { fetch: n.fetch, direct: false }),
    null,
  );
  assert.equal(n.seen.length, 0);
});

test("the record must really be the claimed emoji", async () => {
  const n = net({ "https://plc.directory": plc(), [PDS]: pds(record(":someothercat:")) });
  assert.equal(await verifyEmojiClaim({ did: DID, name: ":blobcat:" }, { fetch: n.fetch }), null);
  const missing = net({ "https://plc.directory": plc(), [PDS]: pds({ name: ":blobcat:" }) });
  assert.equal(
    await verifyEmojiClaim({ did: DID, name: ":blobcat:" }, { fetch: missing.fetch }),
    null,
    "no formats",
  );
});

test("non-https endpoints and credentials are refused", async () => {
  const insecure = net({
    "https://plc.directory": () =>
      json({
        service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: "http://pds.example" }],
      }),
    "http://pds.example": pds(),
  });
  assert.equal(
    await verifyEmojiClaim({ did: DID, name: ":blobcat:" }, { fetch: insecure.fetch }),
    null,
  );
  assert.ok(!insecure.seen.some((u) => u.startsWith("http://")));
  const creds = net({
    "https://plc.directory": () =>
      json({
        service: [
          { type: "AtprotoPersonalDataServer", serviceEndpoint: "https://u:p@pds.example" },
        ],
      }),
  });
  assert.equal(
    await verifyEmojiClaim({ did: DID, name: ":blobcat:" }, { fetch: creds.fetch }),
    null,
  );
  const av = net({ "http://a.example": appview(view()) });
  assert.equal(
    await verifyEmojiClaim(
      { did: DID, name: ":blobcat:" },
      { fetch: av.fetch, appviews: ["http://a.example"], direct: false },
    ),
    null,
  );
  assert.equal(av.seen.length, 0, "http AppView skipped unless allowInsecure");
  const ok = await verifyEmojiClaim(
    { did: DID, name: ":blobcat:" },
    { fetch: av.fetch, appviews: ["http://a.example"], allowInsecure: true },
  );
  assert.equal(ok?.via, "appview");
});

test("a custom resolvePds is used, for hosts that already have one", async () => {
  const n = net({ [PDS]: pds() });
  const r = await verifyEmojiClaim(
    { did: DID, name: ":blobcat:" },
    { fetch: n.fetch, resolvePds: async () => PDS },
  );
  assert.equal(r?.via, "pds");
  assert.ok(!n.seen.some((u) => u.includes("plc.directory")));
});

test("Unicode aliases are looked up under their Punycode rkey", async () => {
  const n = net({
    "https://plc.directory": plc(),
    [PDS]: (url) =>
      url.searchParams.get("rkey") === "xn--wgv71a119e"
        ? json({ cid: "c", value: record(":日本語:") })
        : undefined,
  });
  const r = await verifyEmojiClaim({ did: DID, name: ":日本語:" }, { fetch: n.fetch });
  assert.equal(r?.item.name, ":日本語:");
});

test("a malformed claim throws rather than being looked up", async () => {
  await assert.rejects(verifyEmojiClaim({ did: "not-a-did", name: ":a:" }));
  await assert.rejects(verifyEmojiClaim({ did: DID, name: "::" }));
});
