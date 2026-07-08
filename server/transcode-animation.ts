import { defineProcedure, InvalidRequestError } from "$hatk";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

// Generous relative to the upload page's own 1MB client-side cap (base64
// inflates by ~33%), just enough headroom to reject wildly oversized
// payloads before spawning ffmpeg at all.
const MAX_INPUT_BYTES = 3_000_000;
const FFMPEG_TIMEOUT_MS = 15_000;

async function transcodeToWebp(inputPath: string, size: number, workdir: string): Promise<Buffer> {
  const outputPath = join(workdir, `out-${size}.webp`);
  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-i",
        inputPath,
        "-vf",
        `scale=${size}:${size}`,
        "-loop",
        "0",
        "-an",
        "-vcodec",
        "libwebp_anim",
        "-lossless",
        "0",
        "-q:v",
        "75",
        outputPath,
      ],
      { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
    );
  } catch (e) {
    throw new InvalidRequestError(
      `ffmpeg failed to transcode to ${size}x${size} WebP: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return readFile(outputPath);
}

// Never store raw APNG going forward (RFC 0001 / imgproxy#1222: imgproxy
// can't resize APNG on demand) — transcode to animated WebP once here at
// upload time instead, so the CDN never needs to touch APNG at all. Pure
// transcode utility: doesn't write any record or touch the PDS itself: the
// caller uploads the returned bytes via dev.hatk.uploadBlob, same as any
// other format.
export default defineProcedure("blue.moji.collection.transcodeAnimation", async (ctx) => {
  if (!ctx.viewer) throw new InvalidRequestError("Authentication required");

  const { data } = ctx.input as { data?: string };
  if (!data) throw new InvalidRequestError("data is required");

  let input: Buffer;
  try {
    input = Buffer.from(data, "base64");
  } catch {
    throw new InvalidRequestError("data must be valid base64");
  }
  if (input.length === 0) throw new InvalidRequestError("data must be non-empty");
  if (input.length > MAX_INPUT_BYTES) throw new InvalidRequestError("Input too large");

  const workdir = await mkdtemp(join(tmpdir(), "bluemoji-transcode-"));
  try {
    const inputPath = join(workdir, `in-${randomUUID()}`);
    await writeFile(inputPath, input);

    const [webp128, webp512] = await Promise.all([
      transcodeToWebp(inputPath, 128, workdir),
      transcodeToWebp(inputPath, 512, workdir),
    ]);

    return ctx.ok({
      webp128: webp128.toString("base64"),
      webp512: webp512.toString("base64"),
    });
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
});
