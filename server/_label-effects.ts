// Underscore prefix keeps this module out of the server/ scanner.
//
// What this AppView does with its own moderation labels (RFC 0007). The
// labeler publishes them for everyone to verify; this is how moji.blue itself
// honours the item-level ones: `bluemoji-takedown` removes an emoji from every
// read, `bluemoji-adult` makes it adult-only whatever its record says. Account
// takedowns need no help from here: hatk applies those itself from _repos.status.
//
// Safe when the labeler is off: the table doesn't exist, so nothing is labelled.

type Query = (sql: string, params?: unknown[]) => Promise<unknown[]>;

export const EFFECT_VALUES = ["bluemoji-takedown", "bluemoji-adult"] as const;
type Effect = (typeof EFFECT_VALUES)[number];

// The table appears when the labeler first runs; once seen, stop asking. Until
// then, look again at most once a minute rather than on every request.
let tableSeen = false;
let nextCheck = 0;

async function labelTableExists(query: Query, now: number): Promise<boolean> {
  if (tableSeen) return true;
  if (now < nextCheck) return false;
  nextCheck = now + 60_000;
  const rows = await query(
    `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'moderation_labels' LIMIT 1`,
  ).catch(() => []);
  tableSeen = rows.length > 0;
  return tableSeen;
}

/** Test hook. */
export function resetLabelEffectsCache() {
  tableSeen = false;
  nextCheck = 0;
}

/**
 * The effective labels (latest per subject and value, not negated, not
 * expired) among `values` for each URI. URIs with none are absent from the map.
 */
export async function labelStates(
  query: Query,
  uris: string[],
  now: Date = new Date(),
  values: readonly string[] = EFFECT_VALUES,
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const unique = [...new Set(uris)];
  if (!unique.length) return out;
  if (!(await labelTableExists(query, now.getTime()))) return out;

  const params: unknown[] = [];
  const next = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const inUris = unique.map((u) => next(u)).join(",");
  const inVals = values.map((v) => next(v)).join(",");
  const rows = (await query(
    `SELECT l.uri, l.val FROM moderation_labels l
     WHERE l.neg = 0 AND l.uri IN (${inUris}) AND l.val IN (${inVals})
       AND (l.exp IS NULL OR l.exp > ${next(now.toISOString())})
       AND l.id = (SELECT MAX(id) FROM moderation_labels WHERE uri = l.uri AND val = l.val)`,
    params,
  )) as { uri: string; val: string }[];
  for (const r of rows) {
    if (!out.has(r.uri)) out.set(r.uri, new Set());
    out.get(r.uri)!.add(r.val);
  }
  return out;
}

export async function takendownItemUris(query: Query, uris: string[]): Promise<Set<string>> {
  const states = await labelStates(query, uris);
  return new Set([...states].filter(([, v]) => v.has("bluemoji-takedown")).map(([uri]) => uri));
}

/** Drop the rows whose item URI has been taken down by label. */
export async function withoutTakenDownItems<T>(
  query: Query,
  rows: T[],
  uriOf: (row: T) => string,
): Promise<T[]> {
  if (!rows.length) return rows;
  const hidden = await takendownItemUris(query, rows.map(uriOf));
  return hidden.size ? rows.filter((r) => !hidden.has(uriOf(r))) : rows;
}

export const hasEffect = (states: Map<string, Set<string>>, uri: string, effect: Effect) =>
  states.get(uri)?.has(effect) === true;
