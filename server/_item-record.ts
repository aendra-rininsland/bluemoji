import { aliasToRkey, normalizeAlias } from "../app/lib/alias.ts";
import { cleanProvenance } from "../app/lib/provenance.ts";

export interface ItemInput {
  name: string;
  alt?: string;
  createdAt?: string;
  adultOnly?: boolean;
  formats?: unknown;
  stickerFormats?: unknown;
  /** SPDX license expression */
  license?: string;
  /** http(s) URL this was re-uploaded from */
  source?: string;
}

/**
 * Build the rkey + blue.moji.collection.item record that putItem writes.
 *
 * Optional keys are omitted rather than set to `undefined`: the lexicon
 * validator rejects an explicit `alt: undefined` ("expected string"), and
 * absent JSON keys arrive here as undefined. Throws on an invalid alias, license
 * or source (the message is shown to the client).
 */
export function buildItemRecord(item: ItemInput): {
  rkey: string;
  record: Record<string, unknown>;
} {
  const alias = normalizeAlias(item.name);
  const rkey = aliasToRkey(item.name);

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

  const stickerSrc = item.stickerFormats as Record<string, unknown> | undefined;

  const provenance = cleanProvenance(item.license, item.source);
  if ("error" in provenance) throw new Error(provenance.error);

  return {
    rkey,
    record: {
      $type: "blue.moji.collection.item",
      name: `:${alias}:`,
      ...(item.alt ? { alt: item.alt } : {}),
      createdAt: item.createdAt ?? new Date().toISOString(),
      adultOnly: item.adultOnly ?? false,
      ...provenance,
      formats,
      ...(stickerSrc
        ? {
            stickerFormats: { $type: "blue.moji.collection.item#stickerFormats_v0", ...stickerSrc },
          }
        : {}),
    },
  };
}
