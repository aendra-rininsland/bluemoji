// Browser-side pipeline that turns one Mastodon custom emoji into a
// blue.moji.collection.item in the viewer's repo. Mirrors the renditions the
// manual upload page produces (original + png_128, animated webp_128 via the
// server-side ffmpeg transcode, optional 512px sticker rendition), but pulls
// the source bytes from the same-origin /import/mastodon/image proxy.
import { callXrpc } from "$hatk/client";
import { normalizeAlias } from "./alias";

const MAX_INLINE_BYTES = 128_000;
const MAX_STICKER_BYTES = 512_000;
const MAX_TRANSCODE_INPUT = 2_000_000;

export interface ImportOptions {
  did: string;
  shortcode: string;
  animated: boolean;
  sticker: boolean;
  adultOnly: boolean;
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
  canvas.getContext("2d")!.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image export failed"))), "image/png"),
  );
}

async function upload(blob: Blob): Promise<unknown> {
  return (await callXrpc("dev.hatk.uploadBlob", blob)).blob;
}

export interface ImportResult {
  uri: string;
  /** Set when the emoji imported but not exactly as asked (e.g. animation dropped). */
  warning?: string;
}

/** Imports one emoji. */
export async function importMastodonEmoji(o: ImportOptions): Promise<ImportResult> {
  const alias = normalizeAlias(o.shortcode);

  const res = await fetch(`/import/mastodon/image?shortcode=${encodeURIComponent(o.shortcode)}`);
  if (!res.ok) throw new Error(`Couldn't download image (HTTP ${res.status})`);
  const source = await res.blob();

  const formats: Record<string, unknown> = {
    $type: "blue.moji.collection.item#formats_v1",
    original: await upload(source),
  };
  let stickerFormats: Record<string, unknown> | undefined;

  const png128 = await renderSquare(source, 128);
  if (png128.size > MAX_INLINE_BYTES) throw new Error("Too large after resizing to 128px");
  formats.png_128 = await upload(png128);

  let warning: string | undefined;
  if (o.animated && source.size > MAX_TRANSCODE_INPUT) {
    warning = "animation skipped: file too large to convert";
  } else if (o.animated) {
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
        }
      }
    } catch (e) {
      // Animation is a nicety: the emoji still imports with its static rendition.
      console.warn(`Animation transcode failed for :${alias}:`, e);
      warning = `animation skipped: ${e instanceof Error ? e.message : "conversion failed"}`;
    }
  }

  if (o.sticker && !stickerFormats && !o.animated) {
    const png512 = await renderSquare(source, 512);
    if (png512.size <= MAX_STICKER_BYTES) {
      stickerFormats = {
        $type: "blue.moji.collection.item#stickerFormats_v0",
        png_512: await upload(png512),
      };
    }
  }

  const { uri } = await callXrpc("blue.moji.collection.putItem", {
    repo: o.did,
    item: {
      name: `:${alias}:`,
      createdAt: new Date().toISOString(),
      adultOnly: o.adultOnly,
      formats,
      ...(stickerFormats ? { stickerFormats } : {}),
    } as any,
  });
  return { uri, warning };
}

/** Create a pack and return its AT-URI. */
export async function createPack(did: string, name: string, adultOnly: boolean): Promise<string> {
  const res = await callXrpc("dev.hatk.createRecord", {
    collection: "blue.moji.packs.pack",
    repo: did,
    record: {
      $type: "blue.moji.packs.pack",
      name: name.trim().slice(0, 64),
      adultOnly,
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
