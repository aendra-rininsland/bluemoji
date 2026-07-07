import { defineQuery, NotFoundError } from "$hatk";
import { normalizeFormats, packView, type PackRow } from "./_pack-views.ts";

interface PackItemRow {
  uri: string;
  cid: string;
  subject: string;
  created_at: string;
}

interface ItemRecord {
  name: string;
  alt?: string;
  createdAt?: string;
  formats: unknown;
  stickerFormats?: unknown;
  adultOnly?: boolean;
}

export default defineQuery("blue.moji.packs.getPack", async (ctx) => {
  const { pack } = ctx.params;
  const limit = ctx.limit ?? 50;

  const packRows = (await ctx.db.query(`SELECT * FROM "blue.moji.packs.pack" WHERE uri = $1`, [
    pack,
  ])) as PackRow[];
  const packRow = packRows[0];
  if (!packRow) throw new NotFoundError("Pack not found");
  if (await ctx.isTakendown(packRow.did)) throw new NotFoundError("Pack not found");

  const params: unknown[] = [pack];
  let cursorClause = "";
  const unpacked = ctx.cursor ? ctx.unpackCursor(ctx.cursor) : null;
  if (unpacked) {
    cursorClause = `AND (created_at > $2 OR (created_at = $2 AND cid > $3))`;
    params.push(unpacked.primary, unpacked.cid);
  }

  const itemRows = (await ctx.db.query(
    `SELECT uri, cid, subject, created_at FROM "blue.moji.packs.packitem"
     WHERE pack = $1 ${cursorClause}
     ORDER BY created_at ASC, cid ASC
     LIMIT ${limit + 1}`,
    params,
  )) as PackItemRow[];

  const hasMore = itemRows.length > limit;
  const page = itemRows.slice(0, limit);

  // The lexicon says duplicate packitem records are ignored.
  const seen = new Set<string>();
  const deduped = page.filter((row) => {
    if (seen.has(row.subject)) return false;
    seen.add(row.subject);
    return true;
  });

  const subjects = await ctx.getRecords<ItemRecord>(
    "blue.moji.collection.item",
    deduped.map((row) => row.subject),
  );

  const items = deduped.flatMap((row) => {
    const subject = subjects.get(row.subject);
    if (!subject) return [];
    return [
      {
        $type: "blue.moji.packs.defs#packItemView",
        uri: row.uri,
        subject: {
          $type: "blue.moji.collection.item#itemView",
          uri: subject.uri,
          did: subject.did,
          name: subject.value.name,
          alt: subject.value.alt,
          createdAt: subject.value.createdAt,
          formats: normalizeFormats(subject.value.formats),
          stickerFormats: normalizeFormats(subject.value.stickerFormats),
          adultOnly: Boolean(subject.value.adultOnly),
        },
      },
    ];
  });

  const countRow = (await ctx.db.query(
    `SELECT COUNT(DISTINCT subject) AS n FROM "blue.moji.packs.packitem" WHERE pack = $1`,
    [pack],
  )) as { n: number }[];
  const itemCount = countRow[0]?.n ?? items.length;

  const labels = (await ctx.labels([packRow.uri])).get(packRow.uri) ?? [];
  const view = await packView(ctx, packRow, itemCount, labels);

  let viewer: { savedToCollection?: boolean } | undefined;
  if (ctx.viewer && deduped.length > 0) {
    const placeholders = deduped.map((_, i) => `$${i + 2}`).join(",");
    const saved = (await ctx.db.query(
      `SELECT COUNT(*) AS n FROM "blue.moji.collection.item"
       WHERE did = $1 AND copy_of IN (${placeholders})`,
      [ctx.viewer.did, ...deduped.map((row) => row.subject)],
    )) as { n: number }[];
    viewer = { savedToCollection: (saved[0]?.n ?? 0) > 0 };
  }

  const last = page[page.length - 1];
  return ctx.ok({
    pack: { ...view, viewer },
    items,
    cursor: hasMore && last ? ctx.packCursor(last.created_at, last.cid) : undefined,
  });
});
