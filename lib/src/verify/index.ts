/**
 * @file
 * Verify a Bluemoji claim (a facet, sticker embed or reaction `emojiRef`)
 * against the real `blue.moji.collection.item` record.
 *
 * The `did`, `formats`, `alt`, `adultOnly` and `labels` on a facet are written
 * by whoever wrote the post and are never checked by the PDS, so they must not
 * decide what image to show. The item record in the emoji owner's repo is the
 * truth. This module finds it, trying in order:
 *
 *   1. a local index you run (`index`),
 *   2. AppViews you list (`appviews`), in order, and
 *   3. the owner's own PDS (`direct`, on by default).
 *
 * There is deliberately **no default AppView**: relying on someone else's
 * server should be a choice you made, not a default you inherited.
 *
 * Moderation: an AppView can take an account's emoji down; the owner's PDS
 * cannot tell you that. So an AppView answering "not found" is final (we do
 * not fall through to the PDS and undo its decision), while an AppView that is
 * down, slow or erroring is skipped. Results say which one answered
 * (`via`), and `moderated` is false for the direct path.
 */
import { aliasToRkey } from "../util/alias";
import type * as BlueMojiCollectionItem from "../client/types/blue/moji/collection/item";

export type ItemView = BlueMojiCollectionItem.ItemView;

export interface VerifiedEmoji {
  item: ItemView;
  /** Which source answered. */
  via: "index" | "appview" | "pds";
  /** The AppView's base URL when `via` is "appview". */
  appview?: string;
  /**
   * False when the answer came straight from the owner's PDS, which knows
   * nothing about takedowns or labels applied by an AppView or labeler.
   */
  moderated: boolean;
}

export interface VerifyOptions {
  /** Your own lookup, e.g. a database fed by the firehose. `undefined` means "don't know". */
  index?: (did: string, name: string) => Promise<ItemView | null | undefined>;
  /** AppView base URLs implementing `blue.moji.collection.getItem`, tried in order. None by default. */
  appviews?: string[];
  /** Fall back to the owner's PDS. Default true. */
  direct?: boolean;
  /**
   * fetch to use for requests to AppViews and PDSes. **On a server, pass one
   * that refuses private addresses**: a PDS endpoint comes from a DID document
   * anyone can write.
   */
  fetch?: typeof globalThis.fetch;
  /** Resolve a DID to its PDS endpoint. Defaults to plc.directory / did:web over `fetch`. */
  resolvePds?: (did: string) => Promise<string | null>;
  plcUrl?: string;
  /** Per request. Default 8000. */
  timeoutMs?: number;
  /** Allow http:// PDS and AppView URLs (local development only). */
  allowInsecure?: boolean;
}

const COLLECTION = "blue.moji.collection.item";
const DID_RE = /^did:(plc:[a-z2-7]{24}|web:[a-z0-9.-]+)$/i;

/**
 * Find the real item behind a claim, or null if it doesn't exist (or an
 * AppView says it has been taken down). Never throws for a missing emoji;
 * throws only if the claim itself is malformed.
 */
export async function verifyEmojiClaim(
  claim: { did: string; name: string },
  opts: VerifyOptions = {},
): Promise<VerifiedEmoji | null> {
  if (!DID_RE.test(claim.did)) throw new Error("claim.did must be a did:plc or did:web");
  const rkey = aliasToRkey(claim.name); // throws on an invalid alias

  if (opts.index) {
    const hit = await opts.index(claim.did, claim.name).catch(() => undefined);
    if (hit) return { item: hit, via: "index", moderated: true };
    if (hit === null) return null;
  }

  for (const base of opts.appviews ?? []) {
    const answer = await askAppView(base, claim, opts);
    if (answer === "error") continue;
    if (answer === null) return null; // final: a takedown must not be undone by the PDS
    return { item: answer, via: "appview", appview: base, moderated: true };
  }

  if (opts.direct === false) return null;
  const item = await readFromPds(claim.did, rkey, claim.name, opts);
  return item ? { item, via: "pds", moderated: false } : null;
}

function allowed(url: URL, opts: VerifyOptions) {
  if (url.username || url.password) return false;
  return url.protocol === "https:" || (opts.allowInsecure === true && url.protocol === "http:");
}

async function getJson(url: URL, opts: VerifyOptions): Promise<{ status: number; body: any }> {
  const f = opts.fetch ?? globalThis.fetch;
  const res = await f(url, {
    signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    headers: { accept: "application/json" },
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  return { status: res.status, body };
}

/** The item, null for a definitive "no", or "error" to try the next source. */
async function askAppView(
  base: string,
  claim: { did: string; name: string },
  opts: VerifyOptions,
): Promise<ItemView | null | "error"> {
  let url: URL;
  try {
    url = new URL("/xrpc/blue.moji.collection.getItem", base);
  } catch {
    return "error";
  }
  if (!allowed(url, opts)) return "error";
  url.searchParams.set("repo", claim.did);
  url.searchParams.set("name", claim.name);
  try {
    const { status, body } = await getJson(url, opts);
    if (status === 404 || status === 400) return null;
    if (status !== 200 || !body?.item) return "error";
    const item = body.item as ItemView;
    // Trust nothing the AppView says about *which* emoji this is
    if (item.did !== claim.did || aliasKey(item.name) !== aliasKey(claim.name)) return "error";
    return item;
  } catch {
    return "error";
  }
}

const aliasKey = (name: string) => {
  try {
    return aliasToRkey(name);
  } catch {
    return null;
  }
};

async function readFromPds(
  did: string,
  rkey: string,
  name: string,
  opts: VerifyOptions,
): Promise<ItemView | null> {
  const pds = await (opts.resolvePds ?? ((d: string) => defaultResolvePds(d, opts)))(did).catch(
    () => null,
  );
  if (!pds) return null;
  let url: URL;
  try {
    url = new URL("/xrpc/com.atproto.repo.getRecord", pds);
  } catch {
    return null;
  }
  if (!allowed(url, opts)) return null;
  url.searchParams.set("repo", did);
  url.searchParams.set("collection", COLLECTION);
  url.searchParams.set("rkey", rkey);
  try {
    const { status, body } = await getJson(url, opts);
    if (status !== 200 || !body?.value) return null;
    const v = body.value as BlueMojiCollectionItem.Record;
    // The record at this rkey must really be this emoji
    if (typeof v.name !== "string" || aliasKey(v.name) !== rkey || !v.formats) return null;
    if (aliasKey(name) !== rkey) return null;
    return {
      $type: "blue.moji.collection.item#itemView",
      uri: body.uri ?? `at://${did}/${COLLECTION}/${rkey}`,
      cid: body.cid,
      did,
      name: v.name,
      alt: v.alt,
      createdAt: v.createdAt,
      formats: v.formats,
      stickerFormats: v.stickerFormats,
      adultOnly: v.adultOnly === true,
      copyOf: v.copyOf,
      source: v.source,
      license: v.license,
    } as ItemView;
  } catch {
    return null;
  }
}

/**
 * The PDS endpoint for a DID (honouring `resolvePds`, `plcUrl`, `fetch`),
 * for callers that need to build blob URLs; null if it can't be resolved or
 * isn't an acceptable (https) endpoint.
 */
export async function resolvePdsEndpoint(
  did: string,
  opts: VerifyOptions = {},
): Promise<string | null> {
  const pds = await (opts.resolvePds ?? ((d: string) => defaultResolvePds(d, opts)))(did).catch(
    () => null,
  );
  if (!pds) return null;
  try {
    return allowed(new URL(pds), opts) ? new URL(pds).origin : null;
  } catch {
    return null;
  }
}

async function defaultResolvePds(did: string, opts: VerifyOptions): Promise<string | null> {
  const url = did.startsWith("did:web:")
    ? new URL(`https://${did.slice("did:web:".length)}/.well-known/did.json`)
    : new URL(`${opts.plcUrl ?? "https://plc.directory"}/${did}`);
  if (!allowed(url, opts)) return null;
  const { status, body } = await getJson(url, opts);
  if (status !== 200) return null;
  const svc = (body?.service as { type: string; serviceEndpoint: string }[] | undefined)?.find(
    (s) => s.type === "AtprotoPersonalDataServer",
  );
  return svc?.serviceEndpoint ?? null;
}
