/**
 * @file
 * A small, portable image proxy for Bluemoji blobs: `GET /img/{did}/{cid}`.
 *
 * Bluemoji facets carry a DID and a blob CID, not a URL. A client can fetch
 * the blob from the owner's PDS directly, but serving it through a proxy you
 * run gives you immutable URLs on your own origin, edge caching, and one place
 * to enforce policy. This is the proxy moji.blue runs, extracted so another
 * AppView can run its own (see README.md, which also has a Cloudflare Worker
 * template).
 *
 * It uses Web APIs only (fetch, Request, Response, Web Crypto), so it runs on
 * Cloudflare Workers, Node, Deno and Bun.
 *
 * What it does, and why:
 *  - serves only blobs whose bytes hash to the CID in the URL, so a PDS can't
 *    serve something else under a URL that will be cached for a year;
 *  - refuses SVG, XML and HTML (stored XSS on your origin) and sandboxes the rest;
 *  - caps the size of what it will read, while streaming, not just by header;
 *  - only talks to https PDS hosts that look public, on the default port, and
 *    re-checks every redirect hop;
 *  - asks an `authorize` hook before it touches a PDS, so a host can serve only
 *    blobs it recognises instead of acting as a free image CDN;
 *  - never lets a cache keep a refusal.
 */
import { blobCidDigest, sha256Matches } from "./cid";
import { isPublicHostname } from "./hosts";
import { BLOB_SECURITY_HEADERS, isServableBlobType } from "./policy";

export { blobCidDigest, sha256Matches } from "./cid";
export { isPublicHostname } from "./hosts";
export { BLOB_SECURITY_HEADERS, blobMime, isServableBlobType } from "./policy";

const DID_RE = /^did:(plc:[a-z2-7]{24}|web:[a-z0-9.-]+)$/i;
const CID_RE = /^[a-z2-7]{10,120}$/i;
export const MAX_BLOB_BYTES = 1_500_000;
const DID_DOC_MAX_BYTES = 64 * 1024;
const MAX_REDIRECTS = 3;

/**
 * Decide whether this host will serve `did`'s blob `cid`.
 *
 * `true` serves it publicly (immutable, CDN-cacheable). `"private"` serves it
 * to this requester only and must not be cached by anything shared: use it for
 * a blob that isn't allowed publicly but that this viewer owns (an upload an
 * index hasn't caught up with). `false` is a definitive no. Throwing means
 * "couldn't tell", answered 503 so nothing caches a wrong refusal.
 */
export type Authorize = (
  did: string,
  cid: string,
) => boolean | "private" | Promise<boolean | "private">;

export interface FetchedBlob {
  status: number;
  headers: { get(name: string): string | null };
  body: Uint8Array;
}

/** Thrown by a `fetchBlob` hook. 413 means "too large"; anything else is reported as 502. */
export class BlobFetchError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export interface BlobProxyConfig {
  /** Without it the proxy serves any blob from any repo. See {@link Authorize}. */
  authorize?: Authorize;
  maxBytes?: number;
  /** fetch for DID documents and PDS blobs. Defaults to the global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Defaults to https://plc.directory. */
  plcUrl?: string;
  /** Per upstream request. Default 8000. */
  timeoutMs?: number;
  /** Allow http:// and non-public PDS hosts (local development only). */
  allowInsecure?: boolean;
  /** Replace DID-to-PDS resolution. Return an https origin or null. */
  resolvePds?: (did: string) => Promise<string | null>;
  /**
   * Replace how a blob is fetched and size-capped. For hosts whose `fetch` can
   * reach internal networks and so need their own connection-level checks (see
   * moji.blue's `app/lib/server/safe-fetch.ts`). Throw {@link BlobFetchError}.
   */
  fetchBlob?: (url: string, opts: { maxBytes: number }) => Promise<FetchedBlob>;
  /** How long a DID's PDS is remembered. Default 1 hour. */
  pdsCacheTtlMs?: number;
  /** Path prefix for {@link BlobProxy.fetch}. Default "/img". */
  basePath?: string;
}

export interface BlobProxy {
  /** Serve one blob. `request` supplies conditional headers. */
  handle(did: string, cid: string, request: Request): Promise<Response>;
  /** Route `GET|HEAD {basePath}/{did}/{cid}` (the DID may be percent-encoded). */
  fetch(request: Request): Promise<Response>;
}

/** A refusal that no cache may keep: a wrong "no" must not outlive the reason for it. */
function refusal(status: number, message: string, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

/** https (http with allowInsecure), no credentials, default port, public-looking host. */
export function allowedUpstream(url: URL, allowInsecure = false): boolean {
  if (url.username || url.password) return false;
  if (allowInsecure) return url.protocol === "https:" || url.protocol === "http:";
  if (url.protocol !== "https:") return false;
  if (url.port && url.port !== "443") return false;
  return isPublicHostname(url.hostname);
}

async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > max) throw new BlobFetchError("Response too large", 413);
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw new BlobFetchError("Response too large", 413);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** GET a URL with manual redirects (each hop re-validated), a timeout and a body cap. */
async function fetchCapped(
  input: string,
  cfg: { fetch: typeof globalThis.fetch; timeoutMs: number; allowInsecure: boolean },
  maxBytes: number,
): Promise<FetchedBlob> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new BlobFetchError("Invalid URL", 502);
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!allowedUpstream(url, cfg.allowInsecure)) throw new BlobFetchError("Host not allowed", 502);
    let res: Response;
    try {
      res = await cfg.fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });
    } catch {
      throw new BlobFetchError("Could not reach the server", 502);
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      try {
        url = new URL(location, url);
      } catch {
        throw new BlobFetchError("Bad redirect", 502);
      }
      continue;
    }
    return { status: res.status, headers: res.headers, body: await readCapped(res, maxBytes) };
  }
  throw new BlobFetchError("Too many redirects", 502);
}

export function createBlobProxy(config: BlobProxyConfig = {}): BlobProxy {
  const doFetch = config.fetch ?? ((...a: Parameters<typeof fetch>) => globalThis.fetch(...a));
  const timeoutMs = config.timeoutMs ?? 8000;
  const allowInsecure = config.allowInsecure === true;
  const maxBytes = config.maxBytes ?? MAX_BLOB_BYTES;
  const plcUrl = (config.plcUrl ?? "https://plc.directory").replace(/\/$/, "");
  const ttl = config.pdsCacheTtlMs ?? 60 * 60 * 1000;
  const basePath = (config.basePath ?? "/img").replace(/\/$/, "");
  const fetchCfg = { fetch: doFetch, timeoutMs, allowInsecure };

  // DID to PDS origin: bounded and expiring, so a user who migrates PDS isn't stuck on the old one
  const cache = new Map<string, { pds: string; expires: number }>();
  const CACHE_MAX = 5000;

  async function defaultResolvePds(did: string): Promise<string | null> {
    let docUrl: string;
    if (did.startsWith("did:web:")) {
      const domain = did.slice("did:web:".length);
      // A bare hostname only: no ports, paths or encoded characters
      if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(domain)) return null;
      docUrl = `https://${domain}/.well-known/did.json`;
    } else {
      docUrl = `${plcUrl}/${did}`;
    }
    const { status, body } = await fetchCapped(docUrl, fetchCfg, DID_DOC_MAX_BYTES);
    if (status !== 200) return null;
    const doc = JSON.parse(new TextDecoder().decode(body)) as {
      service?: { id?: string; type?: string; serviceEndpoint?: string }[];
    };
    const svc = doc.service?.find((s) => s.type === "AtprotoPersonalDataServer");
    if (!svc?.serviceEndpoint) return null;
    const u = new URL(svc.serviceEndpoint);
    return allowedUpstream(u, allowInsecure) ? u.origin : null;
  }

  async function pdsFor(did: string): Promise<string | null> {
    const hit = cache.get(did);
    if (hit && hit.expires > Date.now()) return hit.pds;
    cache.delete(did);
    const pds = await (config.resolvePds ?? defaultResolvePds)(did).catch(() => null);
    if (!pds) return null;
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(did, { pds, expires: Date.now() + ttl });
    return pds;
  }

  async function handle(did: string, cid: string, request: Request): Promise<Response> {
    if (!DID_RE.test(did) || !CID_RE.test(cid)) return refusal(400, "Invalid did or cid");
    // Only content we can verify against its address (every ATProto blob qualifies)
    const digest = blobCidDigest(cid);
    if (!digest) return refusal(400, "Invalid did or cid");

    // Ask before anything else, including the 304 below: a CDN revalidating an
    // entry must not have its life extended for a blob we would now refuse (a
    // taken-down account's, say).
    let access: boolean | "private" = true;
    if (config.authorize) {
      try {
        access = await config.authorize(did, cid);
      } catch {
        return refusal(503, "Could not check this blob", { "retry-after": "5" });
      }
      if (!access) return refusal(404, "Blob not available here");
    }

    // CID-addressed content never changes: any revalidation is a 304.
    if (access === true && request.headers.get("if-none-match")?.includes(cid)) {
      return new Response(null, { status: 304 });
    }

    const pds = await pdsFor(did);
    if (!pds) return refusal(404, "Could not resolve PDS");

    const url = `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
    let upstream: FetchedBlob;
    try {
      upstream = await (config.fetchBlob ?? ((u, o) => fetchCapped(u, fetchCfg, o.maxBytes)))(url, {
        maxBytes,
      });
    } catch (e) {
      const tooBig = e instanceof BlobFetchError && e.status === 413;
      return refusal(tooBig ? 413 : 502, "Blob unavailable");
    }
    if (upstream.status < 200 || upstream.status >= 300) {
      return refusal(upstream.status === 404 ? 404 : 502, "Blob unavailable");
    }

    // The response is cached as immutable for a year under this CID, so the
    // bytes must be the ones it names: a PDS can't serve something else under it.
    if (!(await sha256Matches(upstream.body, digest))) return refusal(502, "Blob unavailable");

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    // Refuses SVG and other active document types
    if (!isServableBlobType(contentType)) return refusal(415, "Unsupported blob type");

    // The body was read in full and capped, so the length is what we send, not
    // whatever the PDS claimed.
    return new Response(upstream.body as BodyInit, {
      headers: {
        "content-type": contentType,
        "cache-control":
          access === "private" ? "private, no-store" : "public, max-age=31536000, immutable",
        ...(access === "private" ? {} : { etag: `"${cid}"` }),
        ...BLOB_SECURITY_HEADERS,
        "content-disposition": "inline",
        "access-control-allow-origin": "*",
        "content-length": String(upstream.body.length),
      },
    });
  }

  async function route(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return refusal(405, "Method not allowed", { allow: "GET, HEAD" });
    }
    const path = new URL(request.url).pathname;
    if (!path.startsWith(`${basePath}/`)) return refusal(404, "Not found");
    const parts = path.slice(basePath.length + 1).split("/");
    if (parts.length !== 2) return refusal(404, "Not found");
    let did: string;
    let cid: string;
    try {
      did = decodeURIComponent(parts[0]);
      cid = decodeURIComponent(parts[1]);
    } catch {
      return refusal(400, "Invalid did or cid");
    }
    const res = await handle(did, cid, request);
    // A HEAD gets the headers a GET would, without the body
    return request.method === "HEAD"
      ? new Response(null, { status: res.status, headers: res.headers })
      : res;
  }

  return { handle, fetch: route };
}

/**
 * An {@link Authorize} that asks an AppView's `blue.moji.collection.checkBlob`
 * whether it indexes the blob as a Bluemoji asset. Only a "yes" is remembered
 * (briefly), so a takedown bites within `cacheMs`. Throws, rather than
 * guessing, when the AppView can't answer.
 */
export function checkBlobAuthorizer(
  appview: string,
  opts: { fetch?: typeof globalThis.fetch; cacheMs?: number; timeoutMs?: number } = {},
): Authorize {
  const allowed = new Map<string, number>();
  const cacheMs = opts.cacheMs ?? 60_000;
  return async (did, cid) => {
    const key = `${did} ${cid}`;
    const until = allowed.get(key);
    if (until && until > Date.now()) return true;
    allowed.delete(key);

    const url = new URL("/xrpc/blue.moji.collection.checkBlob", appview);
    url.searchParams.set("did", did);
    url.searchParams.set("cid", cid);
    const res = await (opts.fetch ?? globalThis.fetch)(url, {
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    });
    if (!res.ok) throw new Error(`checkBlob answered ${res.status}`);
    const { available } = (await res.json()) as { available?: boolean };
    if (typeof available !== "boolean") throw new Error("checkBlob gave no answer");
    if (available) {
      if (allowed.size >= 5000) allowed.delete(allowed.keys().next().value!);
      allowed.set(key, Date.now() + cacheMs);
    }
    return available;
  };
}
