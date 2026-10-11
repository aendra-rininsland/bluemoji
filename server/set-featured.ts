import { defineProcedure, InvalidRequestError } from "$hatk";
import { isAdmin } from "./_admin.ts";

const ITEM_COLLECTION = "blue.moji.collection.item";
const PACK_COLLECTION = "blue.moji.packs.pack";

export default defineProcedure("blue.moji.featured.setFeatured", async (ctx) => {
  if (!ctx.viewer) throw new InvalidRequestError("Authentication required");
  if (!isAdmin(ctx.viewer.did)) throw new InvalidRequestError("Admin access required");

  const { uri, featured } = ctx.input as { uri: string; featured: boolean };
  const match = uri.match(/^at:\/\/(did:[^/]+)\/([^/]+)\/[^/]+$/);
  if (!match) throw new InvalidRequestError("uri must be an at:// record URI");
  const collection = match[2];
  if (collection !== ITEM_COLLECTION && collection !== PACK_COLLECTION) {
    throw new InvalidRequestError("Only emoji, sticker and pack records can be featured");
  }

  if (!featured) {
    await ctx.db.run(`DELETE FROM featured_items WHERE uri = $1`, [uri]);
    return ctx.ok({ uri, featured: false });
  }

  const rows = (await ctx.db.query(`SELECT uri FROM "${collection}" WHERE uri = $1`, [
    uri,
  ])) as unknown[];
  if (rows.length === 0) throw new InvalidRequestError("That record isn't indexed by this AppView");
  if (await ctx.isTakendown(match[1])) throw new InvalidRequestError("That account is taken down");

  await ctx.db.run(
    `INSERT INTO featured_items (uri, kind, featured_by, featured_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (uri) DO NOTHING`,
    [
      uri,
      collection === PACK_COLLECTION ? "pack" : "item",
      ctx.viewer.did,
      new Date().toISOString(),
    ],
  );
  return ctx.ok({ uri, featured: true });
});
