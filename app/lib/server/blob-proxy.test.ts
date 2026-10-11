// Calls the real blob proxy (behind /img/[did]/[cid]) with a mocked PDS.
import assert from "node:assert/strict";
import { proxyBlob } from "./blob-proxy.ts";

const DID = "did:plc:ewvi7nxzyoun6zhxrhs64oiz";
const CID = "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";

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
  try {
    return await proxyBlob(
      did,
      CID,
      mockFetch(contentType),
      new Request("https://moji.blue/img/x/y"),
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
console.log("blob proxy tests passed");
