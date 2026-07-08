import { defineQuery, InvalidRequestError } from "$hatk";
import { itemView, resolveActorDid } from "./_pack-views.ts";

interface ItemRow {
  uri: string;
  did: string;
  name: string;
  alt: string | null;
  created_at: string;
  cid: string;
  formats: string;
  sticker_formats: string | null;
  adult_only: number | null;
  copy_of: string | null;
}

function parseJson(text: string | null): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export default defineQuery("blue.moji.collection.listCollection", async (ctx) => {
  const { repo, reverse } = ctx.params;
  const limit = ctx.limit ?? 50;

  const did = repo ? await resolveActorDid(ctx, repo) : (ctx.viewer?.did ?? null);
  if (!did) {
    throw new InvalidRequestError(
      repo ? "Could not resolve repo" : "repo is required when not authenticated",
    );
  }
  if (await ctx.isTakendown(did)) return ctx.ok({ items: [] });

  const isReverse = reverse === "true";
  const order = isReverse ? "DESC" : "ASC";
  const cmp = isReverse ? "<" : ">";

  const params: unknown[] = [did];
  let cursorClause = "";
  const unpacked = ctx.cursor ? ctx.unpackCursor(ctx.cursor) : null;
  if (unpacked) {
    cursorClause = `AND (created_at ${cmp} $2 OR (created_at = $2 AND cid ${cmp} $3))`;
    params.push(unpacked.primary, unpacked.cid);
  }

  const rows = (await ctx.db.query(
    `SELECT uri, did, name, alt, created_at, cid, formats, sticker_formats, adult_only, copy_of
     FROM "blue.moji.collection.item"
     WHERE did = $1 ${cursorClause}
     ORDER BY created_at ${order}, cid ${order}
     LIMIT ${limit + 1}`,
    params,
  )) as ItemRow[];

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const items = await Promise.all(
    page.map((row) =>
      itemView(ctx, {
        uri: row.uri,
        cid: row.cid,
        did: row.did,
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
});
