// Resize an animated WebP to a square, keeping every frame and its timing.
//
// ffmpeg can't do this: its WebP decoder rejects animated files ("image data
// not found"), so GIF and APNG go through ffmpeg (transcode-animation.ts) and
// animated WebP goes through sharp (libvips), which reads and writes animated
// WebP. `fit: "contain"` letterboxes with transparency, matching the ffmpeg
// path's `pad`, so a non-square source isn't stretched.
//
// sharp is imported lazily so that a host without its native binary can still
// boot the AppView; only animated-WebP conversion is then unavailable.

// A decompression-bomb guard: total decoded pixels across all frames.
const MAX_TOTAL_PIXELS = 100_000_000;
const MAX_FRAMES = 300;

export async function transcodeAnimatedWebp(input: Uint8Array, size: number): Promise<Buffer> {
  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default;
  } catch {
    throw new Error("animated WebP conversion is unavailable on this server");
  }

  const src = Buffer.from(input);
  const meta = await sharp(src, { animated: true }).metadata();
  const frames = meta.pages ?? 1;
  const w = meta.width ?? 0;
  const h = meta.pageHeight ?? meta.height ?? 0;
  if (!w || !h) throw new Error("could not read the image dimensions");
  if (frames > MAX_FRAMES) throw new Error(`too many frames (${frames}, max ${MAX_FRAMES})`);
  if (w * h * frames > MAX_TOTAL_PIXELS) throw new Error("the animation is too large to convert");

  return sharp(src, { animated: true, failOn: "error" })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    })
    .webp({ quality: 75, loop: 0 })
    .toBuffer();
}
