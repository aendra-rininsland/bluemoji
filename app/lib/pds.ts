import { SafeFetchError, assertPublicUrl, safeFetch, type Lookup } from "./server/safe-fetch.ts";

// DID → PDS endpoint. Bounded and expiring: a user who migrates PDS must not
// stay pointed at the old one until the process restarts.
const PDS_CACHE_TTL_MS = 60 * 60 * 1000;
const PDS_CACHE_MAX = 5000;
const DID_DOC_MAX_BYTES = 64 * 1024;
const cache = new Map<string, { pds: string; expires: number }>();

/** Test hook. */
export function clearPdsCache() {
  cache.clear();
}

const isProd = () => process.env.NODE_ENV === "production";

export interface ResolvePdsOptions {
  lookup?: Lookup;
  /** fetch for the guarded requests (did:web documents); defaults to a pinned one. */
  guardedFetch?: typeof globalThis.fetch;
  /** Defaults to https://plc.directory in production, the local PLC otherwise. */
  plcUrl?: string;
}

/**
 * Find the PDS that hosts a repo. The DID document is controlled by whoever
 * owns the DID, so the endpoint it names is untrusted: it must be a plain
 * https URL, and callers fetch it through `safeFetch` (see blob-proxy.ts).
 * `did:web` documents are fetched through `safeFetch` too, since the host is
 * chosen by the DID's owner.
 */
export async function resolvePds(
  did: string,
  fetch: typeof globalThis.fetch,
  opts: ResolvePdsOptions = {},
): Promise<string> {
  const hit = cache.get(did);
  if (hit && hit.expires > Date.now()) return hit.pds;
  cache.delete(did);

  let doc: { service?: { type: string; serviceEndpoint: string }[] };
  if (did.startsWith("did:web:")) {
    const domain = did.slice("did:web:".length);
    // Only a bare hostname: no ports, paths or encoded characters
    if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(domain)) {
      throw new Error(`Unsupported did:web: ${did}`);
    }
    try {
      const { res, body } = await safeFetch(
        `https://${domain}/.well-known/did.json`,
        {},
        {
          maxBytes: DID_DOC_MAX_BYTES,
          fetch: opts.guardedFetch,
          lookup: opts.lookup,
          allowLocal: !isProd(),
        },
      );
      if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
      doc = JSON.parse(new TextDecoder().decode(body));
    } catch (e) {
      if (e instanceof SafeFetchError) throw new Error(`Failed to resolve DID: ${did}`);
      throw e;
    }
  } else {
    const plc =
      opts.plcUrl ??
      process.env.PLC_DIRECTORY_URL ??
      (isProd() ? "https://plc.directory" : "http://localhost:2582");
    const res = await fetch(`${plc}/${did}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
    doc = await res.json();
  }

  const svc = doc.service?.find((s) => s.type === "AtprotoPersonalDataServer");
  const pds = svc?.serviceEndpoint ? validPdsEndpoint(svc.serviceEndpoint) : null;
  if (!pds) throw new Error(`No usable PDS found for DID: ${did}`);
  // Many callers fetch this endpoint with a plain fetch, so refuse a public
  // name that points inward here too. (Re-checked per request by safeFetch.)
  try {
    await assertPublicUrl(new URL(pds), opts.lookup, !isProd());
  } catch {
    throw new Error(`PDS endpoint for ${did} is not a public https host`);
  }

  if (cache.size >= PDS_CACHE_MAX) cache.delete(cache.keys().next().value!); // oldest first
  cache.set(did, { pds, expires: Date.now() + PDS_CACHE_TTL_MS });
  return pds;
}

/**
 * The origin of a PDS endpoint if it is acceptable, else null. Production
 * requires https without credentials; a local dev PDS may be http. Whether the
 * host is public is checked at fetch time, where the name is resolved.
 */
export function validPdsEndpoint(endpoint: string): string | null {
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return null;
  }
  if (u.username || u.password) return null;
  if (u.protocol !== "https:" && (isProd() || u.protocol !== "http:")) return null;
  return u.origin;
}

/** Build a blob URL from a PDS endpoint, DID, and BlobRef (or raw CID string). */
export function blobUrl(pds: string, did: string, ref: unknown): string | null {
  const cid = typeof ref === "string" ? ref : ((ref as any)?.ref?.["$link"] ?? null);
  if (!cid) return null;
  return `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

/** Format slots that hold an animation, in the order renderers should prefer them. */
const ANIMATED_SLOTS = ["apng_128", "gif_128", "webp_128"] as const;

/**
 * URL of the item's animated rendition, if it has one (an animated WebP from
 * the Mastodon importer / APNG transcode lives in `webp_128`, which can also
 * hold a plain static WebP — harmless, it just looks the same). Pass a
 * `formats` object whose values are BlobRefs or CID strings.
 */
export function animatedImgUrl(did: string, formats: Record<string, unknown> | undefined) {
  for (const slot of ANIMATED_SLOTS) {
    const url = imgUrl(did, formats?.[slot]);
    if (url) return url;
  }
  return null;
}

/**
 * Best single image for inline display, matching the @aendra/bluemoji
 * renderer's order: animated renditions first, then the static PNG.
 */
export function bestImgUrl(did: string, formats: Record<string, unknown> | undefined) {
  return animatedImgUrl(did, formats) ?? imgUrl(did, formats?.png_128);
}

/**
 * Same-origin blob URL through the /img proxy, so assets are edge-cacheable
 * and same-origin for client-side fetches. Accepts a BlobRef or raw CID.
 */
export function imgUrl(did: string, ref: unknown): string | null {
  const cid = typeof ref === "string" ? ref : ((ref as any)?.ref?.["$link"] ?? null);
  if (!cid) return null;
  return `/img/${encodeURIComponent(did)}/${encodeURIComponent(cid)}`;
}
