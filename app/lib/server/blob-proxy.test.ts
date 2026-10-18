// Calls the real blob proxy (behind /img/[did]/[cid]) with a mocked PDS.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { blobCidDigest, proxyBlob as rawProxyBlob, type BlobProxyOptions } from "./blob-proxy.ts";
import { clearPdsCache } from "../pds.ts";

// The SSRF guard is relaxed outside production (local dev PDS), so test the real thing
process.env.NODE_ENV = "production";
// The mock stands in for both SvelteKit's fetch and the pinned one
const proxyBlob = (
  did: string,
  cid: string,
  f: typeof fetch,
  req: Request,
  o: BlobProxyOptions = {},
) => rawProxyBlob(did, cid, f, req, { guardedFetch: f, ...o });
const publicDns = async () => [{ address: "93.184.216.34" }];

const DID = "did:plc:ewvi7nxzyoun6zhxrhs64oiz";
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
const CID = cidOf("x");
const CID_PNG = cidOf("png");

function mockFetch(contentType: string, body = "x") {
  return (async (input: any) => {
    const url = String(input);
    if (url.includes("plc.directory") || url.includes("localhost:2582")) {
      return new Response(
        JSON.stringify({
          service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: "https://pds.example" }],
        }),
      );
    }
    if (url.startsWith("https://pds.example/xrpc/com.atproto.sync.getBlob")) {
      return new Response(body, { headers: { "content-type": contentType } });
    }
    return new Response("nope", { status: 404 });
  }) as typeof fetch;
}

async function call(contentType: string, did = DID) {
  clearPdsCache();
  try {
    return await proxyBlob(
      did,
      CID,
      mockFetch(contentType),
      new Request("https://moji.blue/img/x/y"),
      { lookup: publicDns },
    );
  } catch (e: any) {
    return { status: e.status as number, headers: new Headers(), thrown: true } as any;
  }
}

// Active document types are refused, however they're spelled
for (const bad of [
  "image/svg+xml",
  "image/svg+xml; charset=utf-8",
  "IMAGE/SVG+XML",
  "text/html",
  "application/xml",
]) {
  const r = await call(bad, DID);
  assert.equal(r.status, 415, `${bad} should be refused`);
}
console.log("ok - SVG and other active document types are refused with 415");

// Ordinary images still work and carry the sandbox headers
for (const ok of ["image/png", "image/webp", "image/gif", "application/octet-stream"]) {
  const r = await call(ok, "did:plc:" + "abcdefghijklmnopqrstuvwx");
  assert.equal(r.status, 200, `${ok} should be served`);
  assert.equal(r.headers.get("content-type"), ok);
  assert.equal(r.headers.get("content-security-policy"), "default-src 'none'; sandbox");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.match(r.headers.get("cache-control") ?? "", /immutable/);
}
console.log("ok - normal blobs are served with a sandboxing CSP, nosniff and immutable caching");

// ------------------------------------------------------------ hardening
type Route = (url: string) => Response | Promise<Response> | undefined;
function router(routes: { plc?: string; blob?: Route; extra?: Route }) {
  const seen: string[] = [];
  const f = (async (input: any) => {
    const url = String(input);
    seen.push(url);
    if (url.includes("plc.directory")) {
      return new Response(
        JSON.stringify({
          service: [
            {
              type: "AtprotoPersonalDataServer",
              serviceEndpoint: routes.plc ?? "https://pds.example",
            },
          ],
        }),
      );
    }
    return (await routes.blob?.(url)) ?? new Response("nope", { status: 404 });
  }) as typeof fetch;
  return { f, seen };
}
async function run(
  r: ReturnType<typeof router>,
  opts: BlobProxyOptions = {},
  did = "did:plc:" + "abcdefghijklmnopqrstuvwx",
) {
  clearPdsCache();
  try {
    return await proxyBlob(did, CID_PNG, r.f, new Request("https://moji.blue/img/x/y"), {
      lookup: publicDns,
      ...opts,
    });
  } catch (e: any) {
    return { status: e.status as number, headers: new Headers() } as any;
  }
}
const png = () => new Response("png", { headers: { "content-type": "image/png" } });

// A DID document can name any endpoint; none of these may be fetched
for (const endpoint of [
  "http://pds.example",
  "https://user:pw@pds.example",
  "https://169.254.169.254",
  "https://10.0.0.5",
  "https://[::1]",
  "https://pds.example:8443",
  "file:///etc/passwd",
]) {
  const r = router({ plc: endpoint, blob: png });
  const res = await run(r);
  assert.ok([404, 502].includes(res.status), `${endpoint} refused (${res.status})`);
  assert.ok(!r.seen.some((u) => u.includes("getBlob")), `${endpoint} never fetched`);
}
console.log("ok - a PDS endpoint that is not a public https host is never fetched");

{
  const r = router({ blob: png });
  const res = await run(r, { lookup: async () => [{ address: "10.1.2.3" }] });
  assert.equal(res.status, 404, "a public-looking name that resolves inward is refused");
  assert.ok(!r.seen.some((u) => u.includes("getBlob")));
  const r2 = router({ blob: png });
  const mixed = await run(r2, {
    lookup: async () => [{ address: "93.184.216.34" }, { address: "127.0.0.1" }],
  });
  assert.equal(mixed.status, 404, "any private answer is enough to refuse");
}
console.log("ok - names resolving to private addresses are refused");

{
  const r = router({
    blob: (u) =>
      u.startsWith("https://pds.example/")
        ? new Response(null, {
            status: 302,
            headers: { location: "http://169.254.169.254/latest" },
          })
        : png(),
  });
  const res = await run(r);
  assert.equal(res.status, 502);
  assert.ok(!r.seen.some((u) => u.includes("169.254")), "the redirect target was never requested");
  const ok = router({
    blob: (u) =>
      u.startsWith("https://pds.example/")
        ? new Response(null, { status: 302, headers: { location: "https://cdn.example/blob" } })
        : u.startsWith("https://cdn.example/")
          ? png()
          : undefined,
  });
  assert.equal((await run(ok)).status, 200, "a redirect to another public host still works");
}
console.log("ok - redirects are re-validated on every hop");

{
  const r = router({
    blob: () =>
      new Response(new Uint8Array(2_000_000), { headers: { "content-type": "image/png" } }),
  });
  assert.equal((await run(r)).status, 413, "oversized body, no content-length");
  const lie = router({
    blob: () => {
      const stream = new ReadableStream({
        pull(c) {
          c.enqueue(new Uint8Array(500_000));
        },
      });
      return new Response(stream, {
        headers: { "content-type": "image/png", "content-length": "10" },
      });
    },
  });
  assert.equal((await run(lie)).status, 413, "an endless stream that understates its length");
  const small = await run(router({ blob: png }));
  assert.equal(small.status, 200);
  assert.equal(small.headers.get("content-length"), "3", "length reflects the bytes sent");
}
console.log("ok - the size cap is enforced while the body streams");

{
  const r = router({ blob: png });
  const denied = await run(r, { authorize: () => false });
  assert.equal(denied.status, 404);
  assert.equal(r.seen.length, 0, "nothing is fetched for an unauthorized blob");
  let asked: string[] = [];
  const ok = await run(router({ blob: png }), {
    authorize: (d, c) => {
      asked = [d, c];
      return true;
    },
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(asked, ["did:plc:abcdefghijklmnopqrstuvwx", CID_PNG]);
}
console.log("ok - the authorize hook gates what the proxy will serve");

{
  const plc: string[] = [];
  const endpoints = ["https://old.example", "https://new.example"];
  const f = (async (input: any) => {
    const url = String(input);
    if (url.includes("plc.directory")) {
      plc.push(url);
      return new Response(
        JSON.stringify({
          service: [
            {
              type: "AtprotoPersonalDataServer",
              serviceEndpoint: endpoints[plc.length - 1] ?? endpoints[1],
            },
          ],
        }),
      );
    }
    return url.startsWith("https://new.example/") ? png() : new Response("gone", { status: 404 });
  }) as typeof fetch;
  clearPdsCache();
  const req = () => new Request("https://moji.blue/img/x/y");
  const did = "did:plc:" + "abcdefghijklmnopqrstuvwx";
  const o = { lookup: publicDns };
  assert.equal((await proxyBlob(did, CID_PNG, f, req(), o).catch((e) => e)).status, 404);
  await proxyBlob(did, CID_PNG, f, req(), o).catch(() => {});
  assert.equal(plc.length, 1, "cached within the TTL");
  const realNow = Date.now;
  Date.now = () => realNow() + 2 * 60 * 60 * 1000;
  try {
    assert.equal(
      (await proxyBlob(did, CID_PNG, f, req(), o)).status,
      200,
      "migrated PDS is found after the TTL",
    );
  } finally {
    Date.now = realNow;
  }
  assert.equal(plc.length, 2);
}
console.log("ok - the DID to PDS cache expires, so a migrated user is not stuck on the old PDS");

{
  const f = (async (input: any) => {
    const url = String(input);
    if (url.includes("evil.example")) return new Response(JSON.stringify({ service: [] }));
    return new Response("nope", { status: 404 });
  }) as typeof fetch;
  clearPdsCache();
  const res = await proxyBlob(
    "did:web:evil.example",
    CID_PNG,
    f,
    new Request("https://moji.blue/img/x/y"),
    {
      lookup: async () => [{ address: "192.168.1.1" }],
    },
  ).catch((e) => e);
  assert.equal(res.status, 404, "a did:web host that resolves inward is not fetched");
}
console.log("ok - did:web documents are fetched through the SSRF guard");

async function rawProxyBlobStatus(cid: string, r: ReturnType<typeof router>) {
  clearPdsCache();
  return rawProxyBlob(
    "did:plc:abcdefghijklmnopqrstuvwx",
    cid,
    r.f,
    new Request("https://moji.blue/img/x/y"),
    {
      guardedFetch: r.f,
      lookup: publicDns,
    },
  ).then(
    (x) => x.status,
    (e: any) => e.status as number,
  );
}

// ---------------------------------------------------- CID verification
// The well-known CID of zero bytes, so the encoder and decoder are checked against a fixed vector
const EMPTY = "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
assert.equal(cidOf(""), EMPTY);
assert.deepEqual(blobCidDigest(EMPTY), createHash("sha256").update("").digest());
assert.deepEqual(blobCidDigest(CID_PNG), createHash("sha256").update("png").digest());
for (const notABlobCid of [
  "bafyreigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  "Qmabcdefghijklmnop",
  "bnotbase32!!!!!!!!",
  "b",
]) {
  assert.equal(blobCidDigest(notABlobCid), null, notABlobCid);
}
{
  // A PDS that returns other bytes under a valid CID is refused
  const wrong = router({
    blob: () => new Response("not the png", { headers: { "content-type": "image/png" } }),
  });
  assert.equal((await run(wrong)).status, 502);
  // and so is a CID that is not an ATProto blob CID at all (dag-cbor here)
  const r = router({ blob: png });
  const res = await rawProxyBlobStatus(
    "bafyreigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    r,
  );
  assert.equal(res, 400);
  assert.equal(r.seen.length, 0, "nothing was fetched");
}
console.log("ok - bytes must hash to the CID they are served under");

console.log("blob proxy tests passed");
