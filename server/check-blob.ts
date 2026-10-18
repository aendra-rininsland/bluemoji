import { defineQuery, InvalidRequestError } from "$hatk";
import { blobIsReferenced } from "./_blob-lookup.ts";

// Backs the /img blob proxy's allow-list: it asks, per blob, whether this
// AppView indexes it as a Bluemoji asset (see app/lib/server/blob-proxy.ts).
// Answers come from the index, which is built from signature-verified repo
// commits, so a claim in a post can't get an arbitrary blob served from here.
export default defineQuery("blue.moji.collection.checkBlob", async (ctx) => {
  const { did, cid } = ctx.params;
  if (!did || !cid) throw new InvalidRequestError("did and cid are required");

  if (await ctx.isTakendown(did)) return ctx.ok({ available: false });
  return ctx.ok({ available: await blobIsReferenced(ctx.db.query, did, cid) });
});
