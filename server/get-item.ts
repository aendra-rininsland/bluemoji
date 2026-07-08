import { defineQuery, InvalidRequestError, NotFoundError } from "$hatk";
import { normalizeFormats, resolveActorDid } from "./_pack-views.ts";
import { aliasToRkey } from "../app/lib/alias.ts";

interface ItemRecord {
  name: string;
  alt?: string;
  createdAt?: string;
  formats: unknown;
  stickerFormats?: unknown;
  adultOnly?: boolean;
}

// The AppView-indexed lookup that verification elsewhere in this codebase
// (get-reactions.ts, the post-page renderer) treats as ground truth: items
// are only indexed here after the relay verifies the writer's repo commit,
// so — unlike the self-attested did/formats on a facet or reaction — this
// is not something a poster can forge.
export default defineQuery("blue.moji.collection.getItem", async (ctx) => {
  const { repo, name } = ctx.params;
  if (!repo || !name) throw new InvalidRequestError("repo and name are required");

  const did = await resolveActorDid(ctx, repo);
  if (!did) throw new NotFoundError("Could not resolve repo");
  if (await ctx.isTakendown(did)) throw new NotFoundError("Emoji not found");

  let rkey: string;
  try {
    rkey = aliasToRkey(name);
  } catch (e) {
    throw new InvalidRequestError(e instanceof Error ? e.message : "Invalid alias");
  }

  const uri = `at://${did}/blue.moji.collection.item/${rkey}`;
  const records = await ctx.getRecords<ItemRecord>("blue.moji.collection.item", [uri]);
  const record = records.get(uri);
  if (!record) throw new NotFoundError("Emoji not found");

  return ctx.ok({
    uri: record.uri,
    item: {
      $type: "blue.moji.collection.item#itemView",
      uri: record.uri,
      did: record.did,
      name: record.value.name,
      alt: record.value.alt,
      createdAt: record.value.createdAt,
      formats: normalizeFormats(record.value.formats),
      stickerFormats: normalizeFormats(record.value.stickerFormats),
      adultOnly: Boolean(record.value.adultOnly),
    },
  });
});
