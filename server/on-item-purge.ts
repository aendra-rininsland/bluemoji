import { defineHook } from "$hatk";
import { aliasFromUri, purgeItem, purger } from "./_purge-runtime.ts";

// When an emoji record is created, replaced or deleted, whatever getItem last
// returned for it is stale. Fires for live firehose commits only (not backfill),
// so this stays a trickle.
export default defineHook(
  "on-commit",
  { collections: ["blue.moji.collection.item"] },
  async (ctx) => {
    if (!purger.enabled) return;
    const name = (ctx.record?.name as string | undefined) ?? aliasFromUri(ctx.uri);
    await purgeItem(ctx.db.query, ctx.repo, name);
  },
);
