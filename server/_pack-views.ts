import type { XrpcContext } from "@hatk/hatk/xrpc";

// Underscore prefix keeps this module out of the server/ scanner.

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
