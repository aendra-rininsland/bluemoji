// Same-origin blob proxy so emoji/sticker assets can be edge-cached by the
// CDN in front of moji.blue. Blobs are CID-addressed, hence immutable.
// Served by app/routes/img/[did]/[cid]/+server.ts.
//
// The behaviour lives in `@aendra/bluemoji/img-proxy` (lib/src/img-proxy), a
// Web-API-only core that other AppViews run on Workers, Deno or Bun. This file
// plugs in the Node-only hardening moji.blue adds on top: PDS endpoints come
// from a DID document anyone can write, so they are resolved with `resolvePds`
// and fetched through `safeFetch` (https, public addresses pinned at connect
// time, re-checked on redirects, body capped while it streams).
import {
  BlobFetchError,
  MAX_BLOB_BYTES,
  blobCidDigest as coreDigest,
  createBlobProxy,
  type Authorize,
} from "../../../lib/src/img-proxy/index.ts";
import { resolvePds } from "../pds.ts";
import { SafeFetchError, safeFetch, type Lookup } from "./safe-fetch.ts";

export { MAX_BLOB_BYTES };

/** The SHA-256 digest inside an ATProto blob CID, or null if it isn't one. */
export function blobCidDigest(cid: string): Buffer | null {
  const d = coreDigest(cid);
  return d ? Buffer.from(d) : null;
}

export interface BlobProxyOptions {
  /** See `Authorize` in the core: true | "private" | false, or throw for "couldn't tell". */
  authorize?: Authorize;
  maxBytes?: number;
  /** Injectable DNS resolver, for tests. */
  lookup?: Lookup;
  /** Fetch for the PDS requests, for tests; defaults to one pinned to public addresses. */
  guardedFetch?: typeof globalThis.fetch;
}

export function proxyBlob(
  did: string,
  cid: string,
  fetch: typeof globalThis.fetch,
  request: Request,
  opts: BlobProxyOptions = {},
): Promise<Response> {
  return createBlobProxy({
    authorize: opts.authorize,
    maxBytes: opts.maxBytes,
    resolvePds: (d) =>
      resolvePds(d, fetch, { lookup: opts.lookup, guardedFetch: opts.guardedFetch }),
    fetchBlob: async (url, { maxBytes }) => {
      try {
        const { res, body } = await safeFetch(
          url,
          {},
          {
            maxBytes,
            fetch: opts.guardedFetch,
            lookup: opts.lookup,
            allowLocal: process.env.NODE_ENV !== "production",
          },
        );
        return { status: res.status, headers: res.headers, body };
      } catch (e) {
        throw new BlobFetchError("Blob unavailable", e instanceof SafeFetchError ? e.status : 502);
      }
    },
  }).handle(did, cid, request);
}
