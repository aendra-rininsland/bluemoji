import { defineQuery, InvalidRequestError } from "$hatk";
import { packViewBasic, resolveActorDid, type PackRow } from "./_pack-views.ts";

export default defineQuery("blue.moji.packs.getActorPacks", async (ctx) => {
  const { actor } = ctx.params;
  const limit = ctx.limit ?? 50;

  const did = await resolveActorDid(ctx, actor);
  if (!did) throw new InvalidRequestError("Could not resolve actor");
  if (await ctx.isTakendown(did)) return ctx.ok({ packs: [] });

  const params: unknown[] = [did];
  let cursorClause = "";
  const unpacked = ctx.cursor ? ctx.unpackCursor(ctx.cursor) : null;
  if (unpacked) {
    cursorClause = `AND (created_at < $2 OR (created_at = $2 AND cid < $3))`;
    params.push(unpacked.primary, unpacked.cid);
  }

  const rows = (await ctx.db.query(
    `SELECT * FROM "blue.moji.packs.pack"
     WHERE did = $1 ${cursorClause}
     ORDER BY created_at DESC, cid DESC
     LIMIT ${limit + 1}`,
    params,
  )) as PackRow[];

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const uris = page.map((row) => row.uri);
  const [counts, labelMap] = await Promise.all([
    ctx.count("blue.moji.packs.packitem", "pack", uris),
    ctx.labels(uris),
  ]);

  const packs = page.map((row) =>
    packViewBasic(ctx, row, counts.get(row.uri) ?? 0, labelMap.get(row.uri) ?? []),
  );

  const last = page[page.length - 1];
  return ctx.ok({
    packs,
    cursor: hasMore && last ? ctx.packCursor(last.created_at, last.cid) : undefined,
  });
});
