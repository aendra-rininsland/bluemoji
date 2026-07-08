import { defineQuery, InvalidRequestError } from "$hatk";
import { packViewBasic, parseUriListParam, type PackRow } from "./_pack-views.ts";

export default defineQuery("blue.moji.packs.getPacks", async (ctx) => {
  const uris = parseUriListParam(ctx.params.uris, 25);
  if (uris.length === 0) throw new InvalidRequestError("uris is required");

  const placeholders = uris.map((_, i) => `$${i + 1}`).join(",");
  const rows = (await ctx.db.query(
    `SELECT * FROM "blue.moji.packs.pack" WHERE uri IN (${placeholders})`,
    uris,
  )) as PackRow[];

  const takendown = await ctx.filterTakendownDids(rows.map((row) => row.did));
  const visible = rows.filter((row) => !takendown.has(row.did));

  const found = new Map(visible.map((row) => [row.uri, row]));
  const ordered = uris.flatMap((uri) => {
    const row = found.get(uri);
    return row ? [row] : [];
  });

  const [counts, labelMap] = await Promise.all([
    ctx.count("blue.moji.packs.packitem", "pack", uris),
    ctx.labels(uris),
  ]);

  const packs = ordered.map((row) =>
    packViewBasic(ctx, row, counts.get(row.uri) ?? 0, labelMap.get(row.uri) ?? []),
  );

  return ctx.ok({ packs });
});
