// What an uploaded file really is, decided from its bytes. A browser's MIME
// type and the file extension are guesses: an APNG saved as `.png` is reported
// as `image/png`, and a GIF dropped on the page as `image/gif`, so deciding by
// either one treated animated files as stills.
import { isAnimated, sniffImage, type ImageType } from "./image";

export type UploadKind =
  /** A Lottie animation; stored as-is, never rendered through canvas. */
  | "lottie"
  /** A GIF, APNG or WebP with more than one frame; needs the server transcode. */
  | "animated"
  /** Anything else raster; a canvas resize is enough. */
  | "static";

export interface Classified {
  kind: UploadKind;
  /** The sniffed raster type, when the bytes are a supported image. */
  type: ImageType | null;
}

function looksLikeLottie(name: string, mime: string): boolean {
  // Only consulted when the raster sniffer recognised nothing.
  const n = name.toLowerCase();
  return (
    mime === "application/lottie+zip" ||
    mime === "application/json" ||
    n.endsWith(".lottie") ||
    n.endsWith(".json")
  );
}

export function classifyUpload(bytes: Uint8Array, name = "", mime = ""): Classified {
  const type = sniffImage(bytes);
  if (type) return { kind: isAnimated(bytes, type) ? "animated" : "static", type };
  if (looksLikeLottie(name, mime)) return { kind: "lottie", type: null };
  return { kind: "static", type: null };
}

/** The `formats` slot a raw animated file belongs in, for when the transcode is unavailable. */
export function rawAnimationSlot(type: ImageType | null): "apng_128" | "gif_128" | "webp_128" {
  if (type === "image/gif") return "gif_128";
  if (type === "image/webp") return "webp_128";
  return "apng_128";
}
