import { defineSetup } from "$hatk";

// Admin-curated "Featured" list. `uri` is the AT-URI of a
// blue.moji.collection.item (emoji or sticker — told apart at read time by
// stickerFormats, per the one-record-type design) or a blue.moji.packs.pack.
// Only the pointer is stored; everything rendered is re-derived from the
// indexed record, so a deleted/taken-down subject simply drops out.
export default defineSetup(async (ctx) => {
  await ctx.db.run(`
    CREATE TABLE IF NOT EXISTS featured_items (
      uri TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      featured_by TEXT NOT NULL,
      featured_at TEXT NOT NULL
    )
  `);
});
