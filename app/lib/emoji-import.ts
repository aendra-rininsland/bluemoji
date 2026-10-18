// Browser-side pipeline that turns one source image (a Mastodon custom emoji,
// a file from a zip, …) into a blue.moji.collection.item in the viewer's
// repo. Mirrors the renditions the manual upload page produces (original +
// png_128, animated webp_128 via the server-side ffmpeg transcode, optional
// 512px sticker rendition).
import { callXrpc } from "$hatk/client";
import { defaultAlt } from "./alt";
import { cleanProvenance } from "./provenance";
import { normalizeAlias } from "./alias";
import { rasteriseSvg } from "./svg";
import type { ImportResult } from "./import-runner";

export type { ImportResult };

const MAX_INLINE_BYTES = 128_000;
const MAX_STICKER_BYTES = 512_000;
const MAX_TRANSCODE_INPUT = 2_000_000;

export interface ImportOptions {
  did: string;
  /** Emoji name, with or without colons; canonicalised per RFC 0005. */
  name: string;
  /** The image bytes, typed (image/png, image/gif, image/webp, image/jpeg). */
  source: Blob;
  animated: boolean;
  sticker: boolean;
  adultOnly: boolean;
  alt?: string;
  /** SPDX license expression, applied to the new item */
  license?: string;
  /** URL the emoji was re-uploaded from (stored as the record's `source`) */
  sourceUrl?: string;
}

function toBase64(bytes: ArrayBuffer): string {
  let binary = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 0x8000) {
    binary += String.fromCharCode(...arr.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(b64: string, type: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Render the image's first frame, scaled to fit (never stretched) a square canvas. */
async function renderSquare(src: Blob, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(src);
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image export failed"))), "image/png"),
  );
}

async function upload(blob: Blob): Promise<unknown> {
  return (await callXrpc("dev.hatk.uploadBlob", blob)).blob;
}

const SVG_RASTER_SIDES = [512, 256]; // fall back to a smaller render if the PNG is too big
const MAX_ORIGINAL_BYTES = 1_000_000; // lexicon limit for formats.original

/** Rasterise an SVG to a PNG small enough to be the emoji's `original`. */
async function rasteriseOriginal(svg: Blob): Promise<Blob> {
  for (const side of SVG_RASTER_SIDES) {
    const png = await rasteriseSvg(svg, side);
    if (png.size <= MAX_ORIGINAL_BYTES) return png;
  }
  throw new Error("The SVG is too complex to rasterise within the 1 MB limit");
}

/** Imports one emoji. */
export async function importEmoji(o: ImportOptions): Promise<ImportResult> {
  const alias = normalizeAlias(o.name);
  let { source, animated } = o;

  // SVGs are never stored (they can carry scripts, and the blob proxy would
  // serve them from our origin): rasterise to PNG and use that as the original.
  if (source.type === "image/svg+xml") {
    source = await rasteriseOriginal(source);
    animated = false;
  }

  const formats: Record<string, unknown> = {
    $type: "blue.moji.collection.item#formats_v1",
    original: await upload(source),
  };
  let stickerFormats: Record<string, unknown> | undefined;

  const png128 = await renderSquare(source, 128);
  if (png128.size > MAX_INLINE_BYTES) throw new Error("Too large after resizing to 128px");
  formats.png_128 = await upload(png128);

  let warning: string | undefined;
  if (animated && source.size > MAX_TRANSCODE_INPUT) {
    warning = "animation skipped: file too large to convert";
  } else if (animated && source.type === "image/webp") {
    // The server-side ffmpeg can't decode animated WebP, so don't pretend to try
    warning = "animation skipped: animated WebP files can't be converted yet";
  } else if (animated) {
    try {
      const data = toBase64(await source.arrayBuffer());
      const { webp128, webp512 } = await callXrpc("blue.moji.collection.transcodeAnimation", {
        data,
      });
      const webp128Blob = fromBase64(webp128 as string, "image/webp");
      if (webp128Blob.size <= MAX_INLINE_BYTES) {
        formats.webp_128 = await upload(webp128Blob);
      } else {
        warning = "animation skipped: converted file exceeds the 128 KB limit";
      }
      if (o.sticker && webp512) {
        const s = fromBase64(webp512 as string, "image/webp");
        if (s.size <= MAX_STICKER_BYTES) {
          stickerFormats = {
            $type: "blue.moji.collection.item#stickerFormats_v0",
            webp_512: await upload(s),
          };
        } else {
          warning ??= "sticker skipped: the 512px version exceeds the 512 KB limit";
        }
      }
    } catch (e) {
      // Animation is a nicety: the emoji still imports with its static rendition.
      console.warn(`Animation transcode failed for :${alias}:`, e);
      warning = `animation skipped: ${e instanceof Error ? e.message : "conversion failed"}`;
    }
  }

  if (o.sticker && !stickerFormats && !animated) {
    const png512 = await renderSquare(source, 512);
    if (png512.size <= MAX_STICKER_BYTES) {
      stickerFormats = {
        $type: "blue.moji.collection.item#stickerFormats_v0",
        png_512: await upload(png512),
      };
    } else {
      warning ??= "sticker skipped: the 512px version exceeds the 512 KB limit";
    }
  }

  const { uri } = await callXrpc("blue.moji.collection.putItem", {
    repo: o.did,
    item: {
      name: `:${alias}:`,
      // Sources rarely carry a description; the humanised name beats none
      alt: o.alt || defaultAlt(alias),
      createdAt: new Date().toISOString(),
      adultOnly: o.adultOnly,
      // Empty values are omitted; the server validates and normalises both
      ...(o.license?.trim() ? { license: o.license.trim() } : {}),
      ...(o.sourceUrl?.trim() ? { source: o.sourceUrl.trim() } : {}),
      formats,
      ...(stickerFormats ? { stickerFormats } : {}),
    } as any,
  });
  return { uri, warning };
}

/** Create a pack and return its AT-URI. */
export async function createPack(
  did: string,
  name: string,
  description: string,
  adultOnly: boolean,
  provenance: { license?: string; source?: string } = {},
): Promise<string> {
  const res = await callXrpc("dev.hatk.createRecord", {
    collection: "blue.moji.packs.pack",
    repo: did,
    record: {
      $type: "blue.moji.packs.pack",
      name: name.trim(),
      // Omit the key when empty — an explicit undefined fails lexicon validation
      ...(description.trim() ? { description: description.trim() } : {}),
      adultOnly,
      ...cleanPackProvenance(provenance),
      createdAt: new Date().toISOString(),
    },
  } as any);
  const uri = (res as { uri?: string }).uri;
  if (!uri) throw new Error("PDS didn't return the new pack's URI");
  return uri;
}

export async function addToPack(did: string, packUri: string, itemUri: string): Promise<void> {
  await callXrpc("dev.hatk.createRecord", {
    collection: "blue.moji.packs.packitem",
    repo: did,
    record: {
      $type: "blue.moji.packs.packitem",
      subject: itemUri,
      pack: packUri,
      createdAt: new Date().toISOString(),
    },
  } as any);
}

/** Validated, normalised license/source for a pack record (empty ones omitted); throws with the reason if invalid. */
function cleanPackProvenance(p: { license?: string; source?: string }) {
  const clean = cleanProvenance(p.license, p.source);
  if ("error" in clean) throw new Error(clean.error);
  return clean;
}
