// Image sniffing shared by the browser (zip importer) and the server
// (Mastodon image proxy). Never trust a file extension or Content-Type.

export type ImageType = "image/png" | "image/gif" | "image/webp" | "image/jpeg";

const startsWith = (b: Uint8Array, off: number, sig: number[]) =>
  sig.every((v, i) => b[off + i] === v);
const ascii = (b: Uint8Array, off: number, s: string) =>
  [...s].every((c, i) => b[off + i] === c.charCodeAt(0));

/** Identify an image by its magic bytes, or null if it isn't a supported raster type. */
export function sniffImage(b: Uint8Array): ImageType | null {
  if (startsWith(b, 0, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith(b, 0, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) return "image/webp";
  if (startsWith(b, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  return null;
}

/** Number of frames in a GIF (walks the block structure; stops at the first malformed block). */
function gifFrameCount(b: Uint8Array): number {
  if (b.length < 13) return 0;
  let pos = 13;
  if (b[10] & 0x80) pos += 3 * (1 << ((b[10] & 7) + 1)); // global colour table
  let frames = 0;
  const skipSubBlocks = () => {
    while (pos < b.length && b[pos] !== 0) pos += b[pos] + 1;
    pos++; // terminator
  };
  while (pos < b.length) {
    const block = b[pos++];
    if (block === 0x3b) break; // trailer
    if (block === 0x21) {
      pos++; // extension label
      skipSubBlocks();
    } else if (block === 0x2c) {
      frames++;
      if (frames > 1) return frames;
      if (pos + 9 > b.length) break;
      const flags = b[pos + 8];
      pos += 9;
      if (flags & 0x80) pos += 3 * (1 << ((flags & 7) + 1)); // local colour table
      pos++; // LZW minimum code size
      skipSubBlocks();
    } else {
      break;
    }
  }
  return frames;
}

/** PNG is animated (APNG) iff an acTL chunk precedes the first IDAT. */
function isApng(b: Uint8Array): boolean {
  let pos = 8;
  while (pos + 8 <= b.length) {
    const len = ((b[pos] << 24) | (b[pos + 1] << 16) | (b[pos + 2] << 8) | b[pos + 3]) >>> 0;
    if (ascii(b, pos + 4, "acTL")) return true;
    if (ascii(b, pos + 4, "IDAT")) return false;
    pos += 12 + len;
  }
  return false;
}

/** Animated WebP sets bit 1 of the VP8X feature flags. */
function isAnimatedWebp(b: Uint8Array): boolean {
  return ascii(b, 12, "VP8X") && (b[20] & 0x02) !== 0;
}

/** True when the image has more than one frame. */
export function isAnimated(
  b: Uint8Array,
  type: ImageType = sniffImage(b) ?? "image/jpeg",
): boolean {
  switch (type) {
    case "image/gif":
      return gifFrameCount(b) > 1;
    case "image/png":
      return isApng(b);
    case "image/webp":
      return isAnimatedWebp(b);
    default:
      return false;
  }
}
