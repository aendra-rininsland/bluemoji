// Same-origin blob proxy so emoji/sticker assets can be edge-cached by the
// CDN in front of moji.blue. Blobs are CID-addressed, hence immutable.
// Served by app/routes/img/[did]/[cid]/+server.ts.
//
// The PDS endpoint comes from a DID document anyone can write, so it is only
// ever fetched through `safeFetch` (https, public addresses, re-checked on
// redirects, body capped while it streams).
import { createHash } from "node:crypto";
import { error } from "@sveltejs/kit";
import { BLOB_SECURITY_HEADERS, isServableBlobType } from "../blob-policy";
import { resolvePds } from "../pds";
import { SafeFetchError, safeFetch, type Lookup } from "./safe-fetch";

const DID_RE = /^did:(plc:[a-z2-7]{24}|web:[a-z0-9.-]+)$/i;
const CID_RE = /^[a-z2-7]{10,120}$/i;
export const MAX_BLOB_BYTES = 1_500_000;

const B32 = "abcdefghijklmnopqrstuvwxyz234567";

/**
 * The SHA-256 digest inside an ATProto blob CID, or null if it isn't one.
 * Blob CIDs are fixed by the spec: CIDv1, `raw` codec (0x55), sha2-256, in
 * lower-case base32 multibase (`bafkrei…`), i.e. bytes 01 55 12 20 <32 bytes>.
 */
export function blobCidDigest(cid: string): Buffer | null {
  const c = cid.toLowerCase();
  if (c[0] !== "b") return null;
  let bits = 0;
  let acc = 0;
  const out: number[] = [];
  for (const ch of c.slice(1)) {
    const v = B32.indexOf(ch);
    if (v < 0) return null;
    acc = (acc << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  const b = Buffer.from(out);
  if (b.length !== 36 || b[0] !== 0x01 || b[1] !== 0x55 || b[2] !== 0x12 || b[3] !== 0x20)
    return null;
  return b.subarray(4);
}

export interface BlobProxyOptions {
  /**
   * Decide whether this host is willing to serve `did`'s blob `cid`. Without
   * it the proxy serves any blob from any repo, which makes the host a free
   * image CDN; a Bluemoji AppView would typically allow only CIDs referenced
   * by an indexed `blue.moji.collection.item`.
   */
  authorize?: (did: string, cid: string) => boolean | Promise<boolean>;
  maxBytes?: number;
  /** Injectable DNS resolver, for tests. */
  lookup?: Lookup;
  /** Fetch for the PDS requests, for tests; defaults to one pinned to public addresses. */
  guardedFetch?: typeof globalThis.fetch;
}

export async function proxyBlob(
  did: string,
  cid: string,
  fetch: typeof globalThis.fetch,
  request: Request,
  opts: BlobProxyOptions = {},
): Promise<Response> {
  if (!DID_RE.test(did) || !CID_RE.test(cid)) error(400, "Invalid did or cid");
  // Only content we can verify against its address (every ATProto blob qualifies)
  const digest = blobCidDigest(cid);
  if (!digest) error(400, "Invalid did or cid");

  // CID-addressed content never changes: any revalidation is a 304.
  if (request.headers.get("if-none-match")?.includes(cid)) {
    return new Response(null, { status: 304 });
  }

  if (opts.authorize && !(await opts.authorize(did, cid))) error(404, "Blob not available here");

  const maxBytes = opts.maxBytes ?? MAX_BLOB_BYTES;
  const pds = await resolvePds(did, fetch, {
    lookup: opts.lookup,
    guardedFetch: opts.guardedFetch,
  }).catch(() => null);
  if (!pds) error(404, "Could not resolve PDS");

  let upstream: Response;
  let bytes: Uint8Array;
  try {
    ({ res: upstream, body: bytes } = await safeFetch(
      `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`,
      {},
      {
        maxBytes,
        fetch: opts.guardedFetch,
        lookup: opts.lookup,
        allowLocal: process.env.NODE_ENV !== "production",
      },
    ));
  } catch (e) {
    error(e instanceof SafeFetchError && e.status === 413 ? 413 : 502, "Blob unavailable");
  }
  if (!upstream.ok) error(upstream.status === 404 ? 404 : 502, "Blob unavailable");

  // The response is cached as immutable for a year under this CID, so the
  // bytes must be the ones it names: a PDS can't serve something else under it.
  if (!createHash("sha256").update(bytes).digest().equals(digest)) error(502, "Blob unavailable");

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  // Refuses SVG and other active document types (see $lib/blob-policy)
  if (!isServableBlobType(contentType)) error(415, "Unsupported blob type");

  // The body was read in full and capped, so the length is what we send, not
  // whatever the PDS claimed.
  return new Response(bytes as BodyInit, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
      etag: `"${cid}"`,
      ...BLOB_SECURITY_HEADERS,
      "content-disposition": "inline",
      "access-control-allow-origin": "*",
      "content-length": String(bytes.length),
    },
  });
}
