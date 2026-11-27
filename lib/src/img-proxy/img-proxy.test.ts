import test from "node:test";
import assert from "node:assert";
import { createHash } from "node:crypto";
import {
  BlobFetchError,
  blobCidDigest,
  checkBlobAuthorizer,
  createBlobProxy,
  isPublicHostname,
  isServableBlobType,
  type BlobProxyConfig,
} from "./index";

const DID = "did:plc:abcdefghijklmnopqrstuvwx";
const PDS = "https://pds.example";

/** The CID a PDS would give these bytes: CIDv1, raw, sha2-256, base32. */
function cidOf(body: string | Uint8Array) {
  const bytes = Buffer.concat([
    Buffer.from([1, 0x55, 0x12, 0x20]),
    createHash("sha256").update(body).digest(),
  ]);
  let out = "";
  let bits = 0;
  let acc = 0;
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += "abcdefghijklmnopqrstuvwxyz234567"[(acc >> bits) & 31];
    }
  }
  if (bits) out += "abcdefghijklmnopqrstuvwxyz234567"[(acc << (5 - bits)) & 31];
  return "b" + out;
}
const PNG = "png";
const CID = cidOf(PNG);

type Routes = {
  plc?: string;
  blob?: (url: URL) => Response | undefined;
  doc?: (url: URL) => Response | undefined;
};
function world(r: Routes = {}) {
  const seen: string[] = [];
  const fetch = (async (input: any) => {
    const url = new URL(String(input));
    seen.push(url.href);
    if (url.origin === "https://plc.directory") {
      return new Response(
        JSON.stringify({
          service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: r.plc ?? PDS }],
        }),
      );
    }
    return r.doc?.(url) ?? r.blob?.(url) ?? new Response("nope", { status: 404 });
  }) as typeof globalThis.fetch;
  return { fetch, seen };
}
const png = () => new Response(PNG, { headers: { "content-type": "image/png" } });
const req = (init: RequestInit & { headers?: Record<string, string> } = {}, path = "/img/x/y") =>
  new Request(`https://proxy.example${path}`, init);
const get = (
  w: ReturnType<typeof world>,
  cfg: BlobProxyConfig = {},
  did = DID,
  cid = CID,
  r = req(),
) => createBlobProxy({ fetch: w.fetch, ...cfg }).handle(did, cid, r);

test("a normal blob is served with sandbox headers, immutable caching and a CID etag", async () => {
  const res = await get(world({ blob: png }));
  assert.equal(res.status, 200);
  assert.equal(await res.text(), PNG);
  assert.equal(res.headers.get("content-type"), "image/png");
  assert.equal(res.headers.get("content-security-policy"), "default-src 'none'; sandbox");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.match(res.headers.get("cache-control")!, /public.*immutable/);
  assert.equal(res.headers.get("etag"), `"${CID}"`);
  assert.equal(res.headers.get("content-length"), "3");
});

test("active document types are refused, however they are spelled", async () => {
  for (const bad of [
    "image/svg+xml",
    "image/svg+xml; charset=utf-8",
    "IMAGE/SVG+XML",
    "text/html",
    "application/xml",
  ]) {
    const res = await get(
      world({ blob: () => new Response(PNG, { headers: { "content-type": bad } }) }),
    );
    assert.equal(res.status, 415, bad);
  }
  assert.equal(isServableBlobType("image/webp"), true);
  assert.equal(isServableBlobType("application/octet-stream"), true);
  assert.equal(isServableBlobType("text/plain"), false);
});

test("bad dids and CIDs, including CIDs that aren't blob CIDs, are 400 and never fetched", async () => {
  const w = world({ blob: png });
  for (const [did, cid] of [
    ["not-a-did", CID],
    [DID, "x"],
    [DID, "bafyreigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"], // dag-cbor, not a blob CID
    [DID, "Qmabcdefghijklmnop"],
  ]) {
    assert.equal((await get(w, {}, did, cid)).status, 400, `${did} ${cid}`);
  }
  assert.equal(w.seen.length, 0);
  assert.equal(blobCidDigest(CID)?.length, 32);
  assert.equal(blobCidDigest("bafyreigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"), null);
});

test("bytes must hash to the CID they are served under", async () => {
  const res = await get(
    world({
      blob: () => new Response("something else", { headers: { "content-type": "image/png" } }),
    }),
  );
  assert.equal(res.status, 502);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("a PDS endpoint that isn't a public https host is never fetched", async () => {
  for (const endpoint of [
    "http://pds.example",
    "https://user:pw@pds.example",
    "https://169.254.169.254",
    "https://10.0.0.5",
    "https://[::1]",
    "https://pds.example:8443",
    "https://localhost",
    "https://pds.internal",
    "https://pds",
    "file:///etc/passwd",
  ]) {
    const w = world({ plc: endpoint, blob: png });
    const res = await get(w);
    assert.ok([404, 502].includes(res.status), `${endpoint} (${res.status})`);
    assert.ok(!w.seen.some((u) => u.includes("getBlob")), `${endpoint} never fetched`);
  }
});

test("redirects are re-validated on every hop", async () => {
  const toInternal = world({
    blob: (u) =>
      u.origin === PDS
        ? new Response(null, {
            status: 302,
            headers: { location: "http://169.254.169.254/latest" },
          })
        : png(),
  });
  assert.equal((await get(toInternal)).status, 502);
  assert.ok(
    !toInternal.seen.some((u) => u.includes("169.254")),
    "the redirect target was never requested",
  );

  const toPublic = world({
    blob: (u) =>
      u.origin === PDS
        ? new Response(null, { status: 302, headers: { location: "https://cdn.example/blob" } })
        : u.origin === "https://cdn.example"
          ? png()
          : undefined,
  });
  assert.equal((await get(toPublic)).status, 200, "a redirect to another public host still works");

  const loop = world({
    blob: (u) => new Response(null, { status: 302, headers: { location: u.href + "x" } }),
  });
  assert.equal((await get(loop)).status, 502, "too many hops");
});

test("the size cap is enforced while the body streams", async () => {
  const big = world({
    blob: () =>
      new Response(new Uint8Array(2_000_000), { headers: { "content-type": "image/png" } }),
  });
  assert.equal((await get(big)).status, 413, "no content-length");
  const lie = world({
    blob: () => {
      const stream = new ReadableStream({ pull: (c) => c.enqueue(new Uint8Array(500_000)) });
      return new Response(stream, {
        headers: { "content-type": "image/png", "content-length": "10" },
      });
    },
  });
  assert.equal((await get(lie)).status, 413, "an endless stream that understates its length");
  assert.equal((await get(world({ blob: png }), { maxBytes: 2 })).status, 413, "a configured cap");
});

test("authorize: public, viewer-only, refused and unavailable are distinct", async () => {
  const run = (authorize: BlobProxyConfig["authorize"], r = req()) =>
    get(world({ blob: png }), { authorize }, DID, CID, r);
  const pub = await run(() => true);
  assert.match(pub.headers.get("cache-control")!, /immutable/);

  const priv = await run(() => "private");
  assert.equal(priv.status, 200);
  assert.equal(priv.headers.get("cache-control"), "private, no-store");
  assert.equal(priv.headers.get("etag"), null);

  const no = await run(() => false);
  assert.equal(no.status, 404);
  assert.equal(no.headers.get("cache-control"), "no-store");

  const unsure = await run(() => {
    throw new Error("index unreachable");
  });
  assert.equal(unsure.status, 503);
  assert.equal(unsure.headers.get("cache-control"), "no-store");
  assert.ok(unsure.headers.get("retry-after"));

  const inm = req({ headers: { "if-none-match": `"${CID}"` } });
  assert.equal((await run(() => false, inm)).status, 404, "revalidation is authorised too");
  assert.equal((await run(() => true, inm)).status, 304);
  assert.equal(
    (await run(() => "private", inm)).status,
    200,
    "a private blob never answers with a shareable 304",
  );

  const w = world({ blob: png });
  await get(w, { authorize: () => false });
  assert.equal(w.seen.length, 0, "nothing is fetched for an unauthorized blob");
});

test("the DID to PDS cache expires, so a migrated user is not stuck on the old PDS", async () => {
  let endpoint = "https://old.example";
  const fetch = (async (input: any) => {
    const url = new URL(String(input));
    if (url.origin === "https://plc.directory")
      return new Response(
        JSON.stringify({
          service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: endpoint }],
        }),
      );
    return url.origin === "https://new.example" ? png() : new Response("gone", { status: 404 });
  }) as typeof globalThis.fetch;
  const proxy = createBlobProxy({ fetch });
  assert.equal((await proxy.handle(DID, CID, req())).status, 404);
  endpoint = "https://new.example";
  assert.equal((await proxy.handle(DID, CID, req())).status, 404, "still cached");
  const realNow = Date.now;
  Date.now = () => realNow() + 2 * 60 * 60 * 1000;
  try {
    assert.equal((await proxy.handle(DID, CID, req())).status, 200);
  } finally {
    Date.now = realNow;
  }
});

test("did:web documents come from a public host, and bare hostnames only", async () => {
  const w = world({
    doc: (u) =>
      u.pathname === "/.well-known/did.json"
        ? new Response(
            JSON.stringify({
              service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: PDS }],
            }),
          )
        : u.origin === PDS
          ? png()
          : undefined,
  });
  assert.equal((await get(w, {}, "did:web:alice.example")).status, 200);
  for (const did of [
    "did:web:localhost",
    "did:web:pds.internal",
    "did:web:10.0.0.1",
    "did:web:single",
  ]) {
    const x = world({ doc: () => new Response("{}") });
    assert.equal((await get(x, {}, did)).status, 404, did);
    assert.equal(x.seen.length, 0, `${did} was never fetched`);
  }
});

test("a host with stricter networking can supply its own resolver and blob fetcher", async () => {
  const seen: string[] = [];
  const res = await createBlobProxy({
    resolvePds: async (did) => (did === DID ? "https://pds.example" : null),
    fetchBlob: async (url, { maxBytes }) => {
      seen.push(url);
      assert.equal(maxBytes, 1_500_000);
      return {
        status: 200,
        headers: new Headers({ "content-type": "image/png" }),
        body: new TextEncoder().encode(PNG),
      };
    },
  }).handle(DID, CID, req());
  assert.equal(res.status, 200);
  assert.ok(seen[0].startsWith("https://pds.example/xrpc/com.atproto.sync.getBlob?did="));
  const tooBig = await createBlobProxy({
    resolvePds: async () => PDS,
    fetchBlob: async () => {
      throw new BlobFetchError("big", 413);
    },
  }).handle(DID, CID, req());
  assert.equal(tooBig.status, 413);
});

test("fetch() routes /img/{did}/{cid}, accepts an encoded DID, and answers HEAD", async () => {
  const proxy = createBlobProxy({ fetch: world({ blob: png }).fetch });
  const path = `/img/${encodeURIComponent(DID)}/${CID}`;
  const ok = await proxy.fetch(req({}, path));
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), PNG);
  const raw = await proxy.fetch(req({}, `/img/${DID}/${CID}`));
  assert.equal(raw.status, 200, "raw colons");
  const head = await proxy.fetch(req({ method: "HEAD" }, path));
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "3");
  assert.equal(await head.text(), "");
  assert.equal((await proxy.fetch(req({}, "/other"))).status, 404);
  assert.equal((await proxy.fetch(req({}, `/img/${DID}`))).status, 404);
  assert.equal((await proxy.fetch(req({}, `/img/${DID}/${CID}/x`))).status, 404);
  assert.equal((await proxy.fetch(req({}, "/img/%E0%A4%A/x"))).status, 400);
  const post = await proxy.fetch(req({ method: "POST" }, path));
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
  const custom = createBlobProxy({ fetch: world({ blob: png }).fetch, basePath: "/blobs" });
  assert.equal(
    (await custom.fetch(req({}, `/blobs/${encodeURIComponent(DID)}/${CID}`))).status,
    200,
  );
});

test("isPublicHostname refuses private, loopback, link-local and internal names", () => {
  for (const bad of [
    "localhost",
    "a.localhost",
    "pds.internal",
    "printer.local",
    "pds",
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "[::1]",
    "::",
    "fe80::1",
    "fd00::1",
    "ff02::1",
    "::ffff:7f00:1",
    "",
  ]) {
    assert.equal(isPublicHostname(bad), false, bad);
  }
  for (const good of [
    "pds.example",
    "bsky.social",
    "morel.us-east.host.bsky.network",
    "93.184.216.34",
    "172.32.0.1",
    "2606:4700::1111",
  ]) {
    assert.equal(isPublicHostname(good), true, good);
  }
  // the URL parser normalises tricky spellings; whatever it gives must still be refused
  for (const tricky of [
    "http://0x7f.1/",
    "http://2130706433/",
    "http://[::ffff:127.0.0.1]/",
    "http://127.1/",
  ]) {
    assert.equal(isPublicHostname(new URL(tricky).hostname), false, tricky);
  }
});

test("checkBlobAuthorizer asks an AppView and remembers only a yes", async () => {
  const calls: string[] = [];
  let answer: () => Response = () => new Response(JSON.stringify({ available: true }));
  const fetch = (async (input: any) => (
    calls.push(String(input)), answer()
  )) as typeof globalThis.fetch;
  const auth = checkBlobAuthorizer("https://appview.example", { fetch });
  assert.equal(await auth(DID, CID), true);
  assert.equal(
    calls[0],
    `https://appview.example/xrpc/blue.moji.collection.checkBlob?did=${encodeURIComponent(DID)}&cid=${CID}`,
  );
  await auth(DID, CID);
  assert.equal(calls.length, 1, "a yes is remembered");

  answer = () => new Response(JSON.stringify({ available: false }));
  const no = checkBlobAuthorizer("https://appview.example", { fetch });
  assert.equal(await no(DID, CID), false);
  await no(DID, CID);
  assert.equal(calls.length, 3, "a no is not");

  for (const bad of [
    () => new Response("x", { status: 500 }),
    () => new Response("{}"),
    () => new Response("not json"),
  ]) {
    answer = bad;
    await assert.rejects(checkBlobAuthorizer("https://appview.example", { fetch })(DID, CID));
  }
});
