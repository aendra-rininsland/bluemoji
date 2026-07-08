import { defineQuery, InvalidRequestError } from "$hatk";
import { itemView, resolveActorDid } from "./_pack-views.ts";

interface ItemValue {
  name: string;
  alt?: string;
  createdAt?: string;
  formats: unknown;
  stickerFormats?: unknown;
  adultOnly?: boolean;
  copyOf?: string;
}

interface ItemRow {
  uri: string;
  did: string;
  cid: string;
  created_at: string;
  name: string;
  alt: string | null;
  formats: string;
  sticker_formats: string | null;
  adult_only: number | null;
  copy_of: string | null;
}

function parseJson(text: string | null | undefined): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export default defineQuery("blue.moji.collection.searchItems", async (ctx) => {
  const { q, repo } = ctx.params;
  if (!q || !q.trim()) throw new InvalidRequestError("q is required");
  const limit = ctx.limit ?? 25;

  // Scoped to one repo's own collection (e.g. a composer picker limited to
  // the signed-in user's emoji): a simple LIKE scan is plenty for a single
  // person's collection and lets us paginate + filter by did precisely,
  // which hatk's network-wide FTS (below) isn't set up to do.
  if (repo) {
    const did = await resolveActorDid(ctx, repo);
    if (!did) throw new InvalidRequestError("Could not resolve repo");
    if (await ctx.isTakendown(did)) return ctx.ok({ items: [] });

    const params: unknown[] = [did, `%${q}%`];
    let cursorClause = "";
    const unpacked = ctx.cursor ? ctx.unpackCursor(ctx.cursor) : null;
    if (unpacked) {
      cursorClause = `AND (created_at < $3 OR (created_at = $3 AND cid < $4))`;
      params.push(unpacked.primary, unpacked.cid);
    }

    const rows = (await ctx.db.query(
      `SELECT uri, did, cid, created_at, name, alt, formats, sticker_formats, adult_only, copy_of
       FROM "blue.moji.collection.item"
       WHERE did = $1 AND (name LIKE $2 OR alt LIKE $2) ${cursorClause}
       ORDER BY created_at DESC, cid DESC
       LIMIT ${limit + 1}`,
      params,
    )) as ItemRow[];

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const items = await Promise.all(
      page.map((row) =>
        itemView(ctx, {
          uri: row.uri,
          did: row.did,
          cid: row.cid,
          name: row.name,
          alt: row.alt,
          createdAt: row.created_at,
          formats: parseJson(row.formats),
          stickerFormats: parseJson(row.sticker_formats),
          adultOnly: row.adult_only,
          copyOf: row.copy_of,
        }),
      ),
    );

    const last = page[page.length - 1];
    return ctx.ok({
      items,
      cursor: hasMore && last ? ctx.packCursor(last.created_at, last.cid) : undefined,
    });
  }

  // Network-wide: hatk's built-in FTS over blue.moji.collection.item. Every
  // TEXT column (name, alt) is indexed automatically — no config needed —
  // and takedown filtering is already applied inside ctx.search itself.
  const { records, cursor } = await ctx.search<ItemValue>("blue.moji.collection.item", q, {
    limit,
    cursor: ctx.cursor,
  });

  const items = await Promise.all(
    records.map((row) =>
      itemView(ctx, {
        uri: row.uri,
        did: row.did,
        cid: row.cid,
        name: row.value.name,
        alt: row.value.alt,
        createdAt: row.value.createdAt,
        formats: row.value.formats,
        stickerFormats: row.value.stickerFormats,
        adultOnly: row.value.adultOnly,
        copyOf: row.value.copyOf,
      }),
    ),
  );

  return ctx.ok({ items, cursor });
});
