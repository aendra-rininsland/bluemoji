const cache = new Map<string, string>();

export async function resolvePds(did: string, fetch: typeof globalThis.fetch): Promise<string> {
  const cached = cache.get(did);
  if (cached) return cached;

  let doc: { service?: { type: string; serviceEndpoint: string }[] };
  if (did.startsWith("did:web:")) {
    const domain = did.slice("did:web:".length);
    const res = await fetch(`https://${domain}/.well-known/did.json`);
    if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
    doc = await res.json();
  } else {
    const plc =
      process.env.NODE_ENV === "production" ? "https://plc.directory" : "http://localhost:2582";
    const res = await fetch(`${plc}/${did}`);
    if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
    doc = await res.json();
  }

  const svc = doc.service?.find((s) => s.type === "AtprotoPersonalDataServer");
  if (!svc?.serviceEndpoint) throw new Error(`No PDS found for DID: ${did}`);
  cache.set(did, svc.serviceEndpoint);
  return svc.serviceEndpoint;
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
