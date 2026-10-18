import { defineQuery } from "$hatk";
import { takendownItemUris } from "./_label-effects.ts";
import { isAdmin } from "./_admin.ts";
import { itemView, normalizeFormats, packViewBasic, type PackRow } from "./_pack-views.ts";

interface FeaturedRow {
  uri: string;
  kind: "item" | "pack";
}

interface ItemRecord {
  name: string;
  alt?: string;
  createdAt?: string;
  formats: unknown;
  stickerFormats?: unknown;
  adultOnly?: boolean;
  copyOf?: string;
  source?: string;
  license?: string;
}

const MAX_FEATURED = 200;

export default defineQuery("blue.moji.featured.getFeatured", async (ctx) => {
  const viewerIsAdmin = isAdmin(ctx.viewer?.did);

  const rows = (await ctx.db.query(
    `SELECT uri, kind FROM featured_items ORDER BY featured_at DESC LIMIT ${MAX_FEATURED}`,
  )) as FeaturedRow[];

  const itemUris = rows.filter((r) => r.kind === "item").map((r) => r.uri);
  const packUris = rows.filter((r) => r.kind === "pack").map((r) => r.uri);

  const ownerOf = (uri: string) => uri.match(/^at:\/\/(did:[^/]+)\//)?.[1] ?? "";
  const takendown = await ctx.filterTakendownDids([
    ...new Set(rows.map((r) => ownerOf(r.uri)).filter(Boolean)),
  ]);

  // Items: verified against the indexed record, never from stored claims.
  const records = itemUris.length
    ? await ctx.getRecords<ItemRecord>("blue.moji.collection.item", itemUris)
    : new Map();
  const hiddenItems = await takendownItemUris(ctx.db.query, itemUris);
  const itemViews = await Promise.all(
    itemUris.flatMap((uri) => {
      const rec = records.get(uri);
      if (!rec || takendown.has(rec.did) || hiddenItems.has(uri)) return [];
      return [
        itemView(ctx, {
          uri: rec.uri,
          cid: rec.cid,
          did: rec.did,
          name: rec.value.name,
          alt: rec.value.alt,
          createdAt: rec.value.createdAt,
          formats: rec.value.formats,
          stickerFormats: rec.value.stickerFormats,
          adultOnly: rec.value.adultOnly,
          copyOf: rec.value.copyOf,
          source: rec.value.source,
          license: rec.value.license,
        }),
      ];
    }),
  );
  const isSticker = (v: { stickerFormats?: unknown }) =>
    Object.keys(normalizeFormats(v.stickerFormats) ?? {}).length > 0;

  let packs: ReturnType<typeof packViewBasic>[] = [];
  if (packUris.length) {
    const placeholders = packUris.map((_, i) => `$${i + 1}`).join(",");
    const packRows = (await ctx.db.query(
      `SELECT * FROM "blue.moji.packs.pack" WHERE uri IN (${placeholders})`,
      packUris,
    )) as PackRow[];
    const byUri = new Map(packRows.filter((p) => !takendown.has(p.did)).map((p) => [p.uri, p]));
    const ordered = packUris.flatMap((u) => (byUri.has(u) ? [byUri.get(u)!] : []));
    const [counts, labelMap] = await Promise.all([
      ctx.count(
        "blue.moji.packs.packitem",
        "pack",
        ordered.map((p) => p.uri),
      ),
      ctx.labels(ordered.map((p) => p.uri)),
    ]);
    packs = ordered.map((row) =>
      packViewBasic(ctx, row, counts.get(row.uri) ?? 0, labelMap.get(row.uri) ?? []),
    );
  }

  return ctx.ok({
    emoji: itemViews.filter((v) => !isSticker(v)),
    stickers: itemViews.filter(isSticker),
    packs,
    featuredUris: viewerIsAdmin ? rows.map((r) => r.uri) : undefined,
    viewerIsAdmin,
  });
});
