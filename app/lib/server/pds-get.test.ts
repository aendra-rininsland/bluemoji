import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pdsGet } from "./pds-get.ts";

process.env.NODE_ENV = "production";

// -- behaviour: the same guard as the blob proxy, with the result shaped like a Response
{
  const seen: string[] = [];
  const ok = (async (input: any) => {
    seen.push(String(input));
    return new Response(JSON.stringify({ records: [{ uri: "at://x/y/z" }] }));
  }) as typeof fetch;
  const publicDns = async () => [{ address: "93.184.216.34" }];

  const res = await pdsGet("https://pds.example/xrpc/com.atproto.repo.listRecords?repo=x", {
    fetch: ok,
    lookup: publicDns,
  });
  assert.equal(res?.ok, true);
  assert.equal(res?.status, 200);
  assert.deepEqual(await res!.json(), { records: [{ uri: "at://x/y/z" }] });
  assert.equal(seen.length, 1);

  for (const bad of [
    "http://pds.example/xrpc/x",
    "https://127.0.0.1/xrpc/x",
    "https://169.254.169.254/latest/meta-data",
    "https://pds.example:8443/xrpc/x",
    "https://u:p@pds.example/xrpc/x",
    "not a url",
  ]) {
    assert.equal(await pdsGet(bad, { fetch: ok, lookup: publicDns }), null, bad);
  }
  assert.equal(
    await pdsGet("https://internal.example/xrpc/x", {
      fetch: ok,
      lookup: async () => [{ address: "10.0.0.7" }],
    }),
    null,
    "a name that resolves inward",
  );
  assert.equal(seen.length, 1, "none of the refused URLs were requested");

  const missing = await pdsGet("https://pds.example/xrpc/x", {
    fetch: (async () => new Response("{}", { status: 404 })) as typeof fetch,
    lookup: publicDns,
  });
  assert.equal(missing?.ok, false);
  assert.equal(missing?.status, 404, "a PDS 404 is a response, not a failure");

  const huge = await pdsGet("https://pds.example/xrpc/x", {
    fetch: (async () => new Response(new Uint8Array(3_000_000))) as typeof fetch,
    lookup: publicDns,
  });
  assert.equal(huge, null, "an oversized body is refused");
}
console.log(
  "ok - pdsGet refuses non-public hosts and oversized bodies, and reports PDS errors as responses",
);

// -- guard: code that talks to a PDS must go through the SSRF guard
// Files that name a com.atproto XRPC endpoint must use pdsGet/safeFetch, unless they
// only build a URL or call a fixed host, listed here with the reason.
const ALLOWED_WITHOUT_GUARD: Record<string, string> = {
  "app/lib/pds.ts": "builds blob URLs as strings; fetching goes through safeFetch elsewhere",
  "server/og/pack.ts": "builds blob URLs that fetchCardImage fetches through safeFetch",
  "app/routes/packs/[handle]/[rkey]/export/+server.ts": "calls bsky.social, a fixed host",
};
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "node_modules" || name === ".svelte-kit") return [];
    return statSync(p).isDirectory()
      ? walk(p)
      : /\.(ts|svelte)$/.test(p) && !p.endsWith(".test.ts")
        ? [p]
        : [];
  });
}
const offenders: string[] = [];
let checked = 0;
for (const file of [...walk(join(root, "app")), ...walk(join(root, "server"))]) {
  const rel = file.slice(root.length + 1);
  const code = readFileSync(file, "utf8");
  if (!code.includes("/xrpc/com.atproto.")) continue;
  checked++;
  if (/pds-get|safe-fetch/.test(code) || rel in ALLOWED_WITHOUT_GUARD) continue;
  offenders.push(rel);
}
assert.ok(checked >= 5, `looked at ${checked} files`);
assert.deepEqual(
  offenders,
  [],
  `these call a PDS without pdsGet/safeFetch:\n${offenders.join("\n")}`,
);
console.log(
  `ok - all ${checked} files that call a PDS go through the SSRF guard (or are listed as exceptions)`,
);
console.log("pds-get tests passed");
