// Underscore prefix keeps this module out of the server/ scanner.

type Query = (sql: string, params?: unknown[]) => Promise<unknown[]>;

// Blob CIDs are CIDv1 base32 (see app/lib/server/blob-proxy.ts), so a valid one
// holds nothing LIKE treats specially (%, _) and needs no escaping.
const CID_RE = /^[a-z2-7]{10,120}$/i;

/**
 * Whether `cid` is referenced by an emoji/sticker item's renditions or a pack's
 * icon in `did`'s repo. The renditions and icon are stored as JSON text with
 * the blob CID under a `$link` key, so a substring match scoped to one repo is
 * enough, and cheap: one account's rows, not the table.
 */
export async function blobIsReferenced(query: Query, did: string, cid: string): Promise<boolean> {
  if (!CID_RE.test(cid)) return false;
  const like = `%"${cid}"%`;
  const items = await query(
    `SELECT 1 FROM "blue.moji.collection.item"
       WHERE did = $1 AND (formats LIKE $2 OR sticker_formats LIKE $2) LIMIT 1`,
    [did, like],
  );
  if (items.length) return true;
  const packs = await query(
    `SELECT 1 FROM "blue.moji.packs.pack" WHERE did = $1 AND icon LIKE $2 LIMIT 1`,
    [did, like],
  );
  return packs.length > 0;
}

/** Every blob CID an account's items and packs reference (renditions and icons). */
export async function blobCidsFor(query: Query, did: string): Promise<string[]> {
  const items = (await query(
    `SELECT formats, sticker_formats FROM "blue.moji.collection.item" WHERE did = $1`,
    [did],
  )) as { formats: string | null; sticker_formats: string | null }[];
  const packs = (await query(`SELECT icon FROM "blue.moji.packs.pack" WHERE did = $1`, [did])) as {
    icon: string | null;
  }[];
  const out = new Set<string>();
  const texts = [
    ...items.flatMap((r) => [r.formats, r.sticker_formats]),
    ...packs.map((r) => r.icon),
  ];
  for (const text of texts) {
    if (!text) continue;
    for (const m of text.matchAll(/"\$link"\s*:\s*"([a-z2-7]{10,120})"/gi)) out.add(m[1]);
  }
  return [...out];
}
