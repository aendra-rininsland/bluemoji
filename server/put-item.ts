import { defineProcedure, InvalidRequestError } from "$hatk";
import { aliasToRkey, normalizeAlias } from "../app/lib/alias.ts";

export default defineProcedure("blue.moji.collection.putItem", async (ctx) => {
  if (!ctx.viewer) {
    throw new InvalidRequestError("Authentication required");
  }

  const { repo, item } = ctx.input;

  const isAuthorized = repo === ctx.viewer.did || (ctx.viewer.handle && repo === ctx.viewer.handle);
  if (!isAuthorized) {
    throw new InvalidRequestError("repo must match authenticated user");
  }

  // RFC 0005: canonicalise the alias; non-ASCII aliases get Punycode rkeys.
  let rkey: string;
  let alias: string;
  try {
    alias = normalizeAlias(item.name);
    rkey = aliasToRkey(item.name);
  } catch (e) {
    throw new InvalidRequestError(e instanceof Error ? e.message : "Invalid alias");
  }

  // Accept either formats_v0 or formats_v1 from the client, but always
  // write formats_v1 — all blobs (including apng_128 and lottie) are BlobRefs.
  const src = item.formats as any;

  const formats: Record<string, unknown> = {
    $type: "blue.moji.collection.item#formats_v1",
  };
  if (src?.original) formats.original = src.original;
  if (src?.png_128) formats.png_128 = src.png_128;
  if (src?.apng_128) formats.apng_128 = src.apng_128;
  if (src?.gif_128) formats.gif_128 = src.gif_128;
  if (src?.webp_128) formats.webp_128 = src.webp_128;
  if (src?.lottie) formats.lottie = src.lottie;

  const stickerSrc = (item as any).stickerFormats;
  const stickerFormats = stickerSrc
    ? { $type: "blue.moji.collection.item#stickerFormats_v0", ...stickerSrc }
    : undefined;

  const result = await ctx.putRecord("blue.moji.collection.item", rkey, {
    $type: "blue.moji.collection.item",
    name: `:${alias}:`,
    alt: item.alt,
    createdAt: item.createdAt ?? new Date().toISOString(),
    adultOnly: item.adultOnly ?? false,
    formats,
    ...(stickerFormats ? { stickerFormats } : {}),
  });

  if (!result.uri) {
    throw new InvalidRequestError("PDS did not return a URI for the written record");
  }

  return ctx.ok({ uri: result.uri });
});
