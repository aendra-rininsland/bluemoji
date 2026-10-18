// Which blobs /img/{did}/{cid} will serve: the ones this AppView indexes as
// Bluemoji assets (blue.moji.collection.checkBlob), plus a viewer's own.
import type { BlobProxyOptions } from "./blob-proxy";

const POSITIVE_TTL_MS = 60_000;
const CACHE_MAX = 5000;
const allowed = new Map<string, number>(); // "did cid" → expiry

/** Test hook. */
export function clearBlobAccessCache() {
  allowed.clear();
}

/**
 * Ask the AppView whether it indexes this blob. Throws when it can't answer
 * (the caller turns that into a retryable 503); `false` is a real "no".
 * Only "yes" is remembered, briefly: a refusal may be about a record that is
 * about to be indexed, and a takedown should bite within a minute.
 */
export async function blobIsIndexed(
  fetch: typeof globalThis.fetch,
  did: string,
  cid: string,
): Promise<boolean> {
  const key = `${did} ${cid}`;
  const until = allowed.get(key);
  if (until && until > Date.now()) return true;
  allowed.delete(key);

  const res = await fetch(
    `/xrpc/blue.moji.collection.checkBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`,
  );
  if (!res.ok) throw new Error(`checkBlob answered ${res.status}`);
  const { available } = (await res.json()) as { available?: boolean };
  if (typeof available !== "boolean") throw new Error("checkBlob gave no answer");

  if (available) {
    if (allowed.size >= CACHE_MAX) allowed.delete(allowed.keys().next().value!);
    allowed.set(key, Date.now() + POSITIVE_TTL_MS);
  }
  return available;
}

/** Off switch if the check misbehaves in production: IMG_AUTHORIZE=off. */
export const imgAuthorizeEnabled = (env: Record<string, string | undefined> = process.env) =>
  env.IMG_AUTHORIZE?.toLowerCase() !== "off";

/**
 * The proxy's authorize hook. Indexed blobs are public. A blob that isn't (yet)
 * indexed is still served to the account that owns it, privately, so a fresh
 * upload previews before the firehose delivers its record. The viewer is only
 * looked up when the index says no.
 */
export function makeAuthorizer(deps: {
  fetch: typeof globalThis.fetch;
  viewerDid: () => Promise<string | null | undefined>;
}): NonNullable<BlobProxyOptions["authorize"]> {
  return async (did, cid) => {
    if (await blobIsIndexed(deps.fetch, did, cid)) return true;
    return (await deps.viewerDid()) === did ? "private" : false;
  };
}
