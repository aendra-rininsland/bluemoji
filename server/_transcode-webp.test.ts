// Animated WebP must come out animated: ffmpeg can't decode it, so this path
// uses sharp, and the failure it replaces was every frame but the first being lost.
import assert from "node:assert/strict";
import sharp from "sharp";
import { transcodeAnimatedWebp } from "./_transcode-webp.ts";

async function animatedWebp(frames: number, w: number, h: number, delay: number[]) {
  const raw = Buffer.alloc(w * h * 4 * frames);
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < w * h; i++)
      raw.writeUInt32BE((((f * 80 + 60) << 24) | 0x0000ffff) >>> 0, (f * w * h + i) * 4);
  }
  return sharp(raw, { raw: { width: w, height: h * frames, channels: 4, pageHeight: h } })
    .webp({ loop: 0, delay })
    .toBuffer();
}

const src = await animatedWebp(3, 40, 20, [100, 200, 300]);
assert.equal((await sharp(src, { animated: true }).metadata()).pages, 3, "fixture is animated");

for (const size of [128, 512]) {
  const out = await transcodeAnimatedWebp(src, size);
  const m = await sharp(out, { animated: true }).metadata();
  assert.equal(m.pages, 3, `${size}: every frame is kept`);
  assert.equal(m.width, size, `${size}: width`);
  assert.equal(m.pageHeight, size, `${size}: a non-square source is fitted into a square`);
  assert.deepEqual(m.delay, [100, 200, 300], `${size}: frame timing is kept`);
  assert.equal(m.loop, 0, `${size}: loops forever`);
  assert.equal(out.subarray(8, 12).toString("ascii"), "WEBP");
  assert.ok(out[20] & 0x02, `${size}: the VP8X animation flag is set`);
  // 40x20 into a square is letterboxed with transparency, not stretched or filled
  const first = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(first.data[3], 0, `${size}: the letterbox is transparent`);
}
console.log("ok - animated WebP keeps frames, timing and transparency");

// Limits: a decompression bomb and non-images are refused rather than attempted
const many = await animatedWebp(301, 2, 2, Array(301).fill(20));
await assert.rejects(transcodeAnimatedWebp(many, 128), /too many frames/);
await assert.rejects(transcodeAnimatedWebp(Buffer.from("not an image"), 128));
console.log("ok - frame cap and garbage input are refused");

// A still WebP still converts (one frame), so a mislabelled upload doesn't 500
const still = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#f00" } })
  .webp()
  .toBuffer();
assert.equal((await sharp(await transcodeAnimatedWebp(still, 128)).metadata()).width, 128);
console.log("ok - a still WebP converts too");
console.log("transcode webp tests passed");
