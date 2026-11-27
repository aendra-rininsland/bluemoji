import test from "node:test";
import assert from "node:assert";
import { blobCid, pickRenderable, render } from "./index";

const DID = "did:plc:abcdefghijklmnopqrstuvwx";
const PDS = "https://pds.example";
const blob = (cid: string) => ({
  $type: "blob",
  ref: { $link: cid },
  mimeType: "image/png",
  size: 1,
});
const record = (formats: object, extra: object = {}) => ({
  $type: "blue.moji.collection.item",
  name: ":blobcat:",
  alt: "the real alt",
  createdAt: "2026-01-01T00:00:00.000Z",
  adultOnly: false,
  formats: { $type: "blue.moji.collection.item#formats_v1", ...formats },
  ...extra,
});

function world(value: unknown, extraRoutes: Record<string, () => Response> = {}) {
  const seen: string[] = [];
  const fetch = (async (input: any) => {
    const url = new URL(String(input));
    seen.push(url.href);
    if (url.origin === "https://plc.directory")
      return new Response(
        JSON.stringify({ service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: PDS }] }),
      );
    if (url.pathname.endsWith("getRecord") && url.searchParams.get("rkey") === "blobcat")
      return new Response(JSON.stringify({ uri: "at://x", cid: "bafyreirec", value }));
    const hit = extraRoutes[url.origin + url.pathname];
    return hit ? hit() : new Response("{}", { status: 404 });
  }) as typeof globalThis.fetch;
  return { fetch, seen };
}

// Minimal DOM, enough for <img>
const made: any[] = [];
(globalThis as any).document = {
  createElement: (tag: string) => {
    const el: any = {
      tag,
      attrs: {} as Record<string, string>,
      setAttribute(k: string, v: string) {
        this.attrs[k] = v;
      },
    };
    made.push(el);
    return el;
  },
};
const facet = (over: object = {}) => ({ did: DID, name: ":blobcat:", ...over }) as any;

test("blobCid reads every shape a blob ref arrives in", () => {
  assert.equal(blobCid("bafkreiaaa"), "bafkreiaaa");
  assert.equal(blobCid({ ref: { $link: "bafkreibbb" } }), "bafkreibbb");
  assert.equal(blobCid({ $link: "bafkreiccc" }), "bafkreiccc");
  assert.equal(blobCid({ ref: "bafkreiddd" }), "bafkreiddd");
  assert.equal(blobCid({ ref: { toString: () => "bafkreieee" } }), "bafkreieee");
  assert.equal(blobCid(null), null);
  assert.equal(blobCid({}), null);
  assert.equal(blobCid(true), null, "a legacy boolean claim isn't a CID");
});

test("pickRenderable prefers lottie, then apng, gif, webp, png", () => {
  const all = {
    png_128: blob("p"),
    webp_128: blob("w"),
    gif_128: blob("g"),
    apng_128: blob("a"),
    lottie: blob("l"),
  };
  assert.deepEqual(pickRenderable({ formats: all } as any), {
    kind: "blob",
    format: "lottie",
    cid: "l",
  });
  const { lottie: _l, ...noLottie } = all;
  assert.equal((pickRenderable({ formats: noLottie } as any) as any).format, "apng_128");
  assert.equal(
    (pickRenderable({ formats: { png_128: blob("p"), webp_128: blob("w") } } as any) as any).format,
    "webp_128",
  );
  assert.equal(pickRenderable({ formats: {} } as any), null);
});

test("deprecated v0 inline bytes are decoded", () => {
  const r = pickRenderable({ formats: { lottie: { $bytes: btoa("hello") } } } as any) as any;
  assert.equal(r.kind, "bytes");
  assert.equal(new TextDecoder().decode(r.bytes), "hello");
  assert.equal(
    pickRenderable({ formats: { lottie: { $bytes: "***not base64***" } } } as any),
    null,
  );
});

test("draws the VERIFIED record, not the facet's claim", async () => {
  made.length = 0;
  const w = world(record({ png_128: blob("bafkreirealreal") }));
  const el: any = await render(
    null,
    facet({
      formats: { $type: "blue.moji.richtext.facet#formats_v1", png_128: "bafkreiFORGED" },
      alt: "forged alt",
      adultOnly: false,
    }),
    { fetch: w.fetch },
  );
  assert.ok(el.src.includes("cid=bafkreirealreal"), el.src);
  assert.ok(!el.src.includes("FORGED"));
  assert.equal(el.src.startsWith(`${PDS}/xrpc/com.atproto.sync.getBlob?did=`), true);
  assert.equal(el.attrs.alt, "the real alt");
});

test("an adult-only emoji is flagged even when the facet says it isn't, or hidden on request", async () => {
  const w = world(record({ png_128: blob("bafkreix") }, { adultOnly: true }));
  const shown: any = await render(null, facet({ adultOnly: false }), { fetch: w.fetch });
  assert.equal(shown.attrs["data-adult-only"], "true");
  assert.equal(await render(null, facet(), { fetch: w.fetch, adult: "hide" }), undefined);
});

test("unverifiable emoji render as nothing, so the caller falls back to text", async () => {
  const none = world(undefined);
  assert.equal(
    await render(null, facet({ formats: { png_128: "bafkreiFORGED" } }), { fetch: none.fetch }),
    undefined,
  );
  const down = world(record({ png_128: blob("x") }));
  assert.equal(
    await render(null, facet(), { fetch: down.fetch, verify: { direct: false, appviews: [] } }),
    undefined,
    "with no source allowed, nothing is drawn from the claim alone",
  );
});

test("an AppView's takedown (not found) stops rendering even though the PDS has the record", async () => {
  const w = world(record({ png_128: blob("bafkreix") }), {
    "https://a.example/xrpc/blue.moji.collection.getItem": () =>
      new Response("{}", { status: 404 }),
  });
  assert.equal(
    await render(null, facet(), { fetch: w.fetch, verify: { appviews: ["https://a.example"] } }),
    undefined,
  );
});

test("a custom blobUrl routes images through your proxy", async () => {
  const w = world(record({ png_128: blob("bafkreix") }));
  const el: any = await render(null, facet(), {
    fetch: w.fetch,
    blobUrl: (did, cid) => `https://img.example/${did}/${cid}`,
  });
  assert.equal(el.src, `https://img.example/${DID}/bafkreix`);
});

test("lottie bytes can be returned raw, from a blob or from legacy inline bytes", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const w = world(record({ lottie: blob("bafkreilottie") }), {
    [`${PDS}/xrpc/com.atproto.sync.getBlob`]: () => new Response(bytes),
  });
  const raw: any = await render(null, facet(), { fetch: w.fetch, raw: true });
  assert.deepEqual([...raw], [1, 2, 3]);
  const legacy = world(record({ lottie: { $bytes: btoa("\x01\x02\x03") } }));
  assert.deepEqual(
    [...((await render(null, facet(), { fetch: legacy.fetch, raw: true })) as any)],
    [1, 2, 3],
  );
});

test("a PDS that isn't https is never used to build image URLs", async () => {
  const w = world(record({ png_128: blob("bafkreix") }));
  const insecure = (async (input: any) => {
    const r = await w.fetch(input);
    if (String(input).includes("plc.directory"))
      return new Response(
        JSON.stringify({
          service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: "http://pds.example" }],
        }),
      );
    return r;
  }) as typeof fetch;
  assert.equal(await render(null, facet(), { fetch: insecure }), undefined);
});
