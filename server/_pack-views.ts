import type { XrpcContext } from "@hatk/hatk/xrpc";

// Underscore prefix keeps this module out of the server/ scanner.

/**
 * hatk's XRPC dispatch builds ctx.params from `for (const [k,v] of
 * url.searchParams) params[k] = v`, which silently overwrites on repeated
 * keys — the ATProto-conventional `uris=a&uris=b` array-param form (used by
 * e.g. app.bsky.feed.getPosts) never reaches a handler as an array; only the
 * *last* value survives. Confirmed by direct test against both this
 * codebase's own getPacks and a from-scratch handler — not something fixable
 * from application code, since the raw request is never exposed past
 * dispatch. Until that's fixed upstream in hatk, array-typed query params
 * accept a comma-joined single value instead (AT-URIs never contain commas —
 * rkeys are restricted to [A-Za-z0-9._:~-] — so splitting on "," is safe).
 * The `Array.isArray` branch is dead code today (hatk never produces a real
 * array) but costs nothing to keep for forward-compatibility if that
 * changes.
 */
export function parseUriListParam(raw: unknown, max: number): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? raw.split(",") : [];
  return list.slice(0, max);
}

export interface PackRow {
  uri: string;
  cid: string;
  did: string;
  indexed_at: string;
  name: string;
  description: string | null;
  description_facets: string | null;
  icon: string | null;
  adult_only: number | null;
  created_at: string;
  labels: string | null;
}

function parseJson<T>(text: string | null | undefined): T | undefined {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/**
 * Stored union sub-objects come back with blob refs serialized as JSON strings
 * and absent keys as nulls; normalize into a clean lexicon object for views.
 */
export function normalizeFormats(formats: unknown): Record<string, unknown> | undefined {
  if (!formats || typeof formats !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(formats as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === "string" && value.startsWith("{") ? parseJson(value) : value;
  }
  return out;
}

export async function handlesForDids(
  ctx: Pick<XrpcContext, "db">,
  dids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(dids)];
  if (unique.length === 0) return new Map();
  const placeholders = unique.map((_, i) => `$${i + 1}`).join(",");
  const rows = (await ctx.db.query(
    `SELECT did, handle FROM _repos WHERE did IN (${placeholders})`,
    unique,
  )) as { did: string; handle: string | null }[];
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.handle) map.set(row.did, row.handle);
  }
  return map;
}

export async function resolveActorDid(
  ctx: Pick<XrpcContext, "db">,
  actor: string,
): Promise<string | null> {
  if (actor.startsWith("did:")) return actor;
  const rows = (await ctx.db.query(`SELECT did FROM _repos WHERE handle = $1`, [actor])) as {
    did: string;
  }[];
  return rows[0]?.did ?? null;
}

export function packViewBasic(
  ctx: XrpcContext,
  row: PackRow,
  itemCount: number,
  labels: unknown[],
) {
  return {
    $type: "blue.moji.packs.defs#packViewBasic",
    uri: row.uri,
    cid: row.cid,
    name: row.name,
    description: row.description ?? undefined,
    descriptionFacets: parseJson(row.description_facets),
    avatar: ctx.blobUrl(row.did, parseJson(row.icon)),
    itemCount,
    labels,
    indexedAt: row.indexed_at,
  };
}

// --- Reaction verification (shared by get-reactions.ts and
// get-reaction-counts.ts) ---

export interface ReactionItemRecord {
  name: string;
  alt?: string;
  formats: unknown;
  adultOnly?: boolean;
}

/** Cap on distinct emoji groups returned per subject: an AppView-level anti-
 * spam policy (roadmap: "per-post reaction caps as AppView policy") bounding
 * how many distinct reaction types a single post's UI has to render, since
 * nothing stops someone reacting with hundreds of different emoji. Does not
 * limit how many actors can react with an already-shown emoji — only caps
 * the number of distinct emoji groups displayed, keeping the highest-count
 * ones. */
export const MAX_REACTION_GROUPS = 20;

export function parseEmojiClaim(text: string): { uri?: string } & Record<string, unknown> {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * blue.moji.feed.reaction#emojiRef is self-attested by the reactor (RFC 0001
 * amendment) — a client could claim any did/name/formats. Rebuild it from
 * the indexed blue.moji.collection.item instead of trusting the stored
 * value; that item was only indexed after the relay verified its owner's
 * repo commit, so it's the actual trust anchor. Returns null (caller should
 * drop the reaction) when the claimed subject can't be verified at all.
 */
export function verifiedEmojiRef(
  claimed: { uri?: string },
  verified: Map<string, { uri: string; cid: string; value: ReactionItemRecord }>,
) {
  const uri = claimed.uri;
  if (!uri) return null;
  const record = verified.get(uri);
  if (!record) return null;
  return {
    $type: "blue.moji.feed.reaction#emojiRef",
    uri,
    cid: record.cid,
    name: record.value.name,
    alt: record.value.alt,
    adultOnly: Boolean(record.value.adultOnly),
    formats: normalizeFormats(record.value.formats),
  };
}

export async function packView(
  ctx: XrpcContext,
  row: PackRow,
  itemCount: number,
  labels: unknown[],
) {
  const handles = await handlesForDids(ctx, [row.did]);
  const profiles = await ctx.lookup<{
    displayName?: string;
    description?: string;
    avatar?: unknown;
  }>("app.bsky.actor.profile", "did", [row.did]);
  const profile = profiles.get(row.did)?.value;

  return {
    $type: "blue.moji.packs.defs#packView",
    uri: row.uri,
    cid: row.cid,
    creator: {
      did: row.did,
      handle: handles.get(row.did) ?? "handle.invalid",
      displayName: profile?.displayName,
      avatar: ctx.blobUrl(row.did, profile?.avatar),
    },
    name: row.name,
    description: row.description ?? undefined,
    descriptionFacets: parseJson(row.description_facets),
    avatar: ctx.blobUrl(row.did, parseJson(row.icon)),
    packItemCount: itemCount,
    labels,
    indexedAt: row.indexed_at,
  };
}
