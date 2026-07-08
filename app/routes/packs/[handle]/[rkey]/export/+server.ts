import { error } from "@sveltejs/kit";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ZipFile } from "yazl";
import { encodeStickerPackManifest, type SignalSticker } from "$lib/signal-manifest";
import type { RequestHandler } from "./$types";

const execFileAsync = promisify(execFile);

// Signal's own sticker pack limit (Signal-Desktop's sticker-creator enforces
// this); export truncates rather than producing a pack Signal would reject.
const MAX_STICKERS = 200;

interface ItemView {
  uri: string;
  did: string;
  name: string;
  alt?: string;
  stickerFormats?: Record<string, unknown>;
}

interface PackItemView {
  uri: string;
  subject: ItemView;
}

function blobRefCid(ref: unknown): string | undefined {
  return (ref as { ref?: { $link?: string } } | undefined)?.ref?.$link;
}

async function convertToWebp(bytes: ArrayBuffer, contentType: string): Promise<Buffer> {
  const input = Buffer.from(bytes);
  if (contentType === "image/webp") return input;

  const workdir = await mkdtemp(join(tmpdir(), "bluemoji-export-"));
  try {
    const ext = contentType.split("/")[1] ?? "bin";
    const inputPath = join(workdir, `in-${randomUUID()}.${ext}`);
    const outputPath = join(workdir, "out.webp");
    await writeFile(inputPath, input);
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-i",
        inputPath,
        "-vcodec",
        "libwebp_anim",
        "-lossless",
        "0",
        "-q:v",
        "80",
        outputPath,
      ],
      { timeout: 15_000, maxBuffer: 10 * 1024 * 1024 },
    );
    return await readFile(outputPath);
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

export const GET: RequestHandler = async ({ params, fetch, url }) => {
  const { handle, rkey } = params;

  let did = handle;
  if (!did.startsWith("did:")) {
    const res = await fetch(
      `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    );
    if (!res.ok) error(404, `Could not resolve handle: ${handle}`);
    did = ((await res.json()) as { did: string }).did;
  }

  const packUri = `at://${did}/blue.moji.packs.pack/${rkey}`;
  const res = await fetch(
    `/xrpc/blue.moji.packs.getPack?pack=${encodeURIComponent(packUri)}&limit=200`,
  );
  if (!res.ok) error(res.status === 404 ? 404 : 502, "Pack not found");

  const { pack, items } = (await res.json()) as { pack: any; items: PackItemView[] };

  const stickerItems = items
    .filter(
      (item) => item.subject.stickerFormats && Object.keys(item.subject.stickerFormats).length > 0,
    )
    .slice(0, MAX_STICKERS);

  if (stickerItems.length === 0) {
    error(
      400,
      "This pack has no sticker-capable emoji (items need full-size stickerFormats) to export.",
    );
  }

  const zipfile = new ZipFile();
  const manifestStickers: SignalSticker[] = [];
  let cover: SignalSticker | undefined;

  for (const [i, item] of stickerItems.entries()) {
    const sf = item.subject.stickerFormats!;
    const formatKey = ["webp_512", "png_512", "gif_512", "apng_512"].find((k) => sf[k]);
    if (!formatKey) continue;
    const cid = blobRefCid(sf[formatKey]);
    if (!cid) continue;

    const blobRes = await fetch(
      `/img/${encodeURIComponent(item.subject.did)}/${encodeURIComponent(cid)}`,
    );
    if (!blobRes.ok) continue;
    const contentType = blobRes.headers.get("content-type") ?? "application/octet-stream";
    const bytes = await blobRes.arrayBuffer();

    let webp: Buffer;
    try {
      webp = await convertToWebp(bytes, contentType);
    } catch {
      continue; // skip items ffmpeg can't handle rather than failing the whole export
    }

    const sticker: SignalSticker = { id: i, emoji: item.subject.name };
    zipfile.addBuffer(webp, `${i}.webp`);
    manifestStickers.push(sticker);
    if (!cover) {
      cover = sticker;
      zipfile.addBuffer(webp, "cover.webp");
    }
  }

  if (!cover || manifestStickers.length === 0) {
    error(502, "Could not fetch any sticker images for this pack.");
  }

  const manifest = {
    title: pack.name as string,
    author: `@${pack.creator.handle} via moji.blue`,
    cover,
    stickers: manifestStickers,
  };
  zipfile.addBuffer(encodeStickerPackManifest(manifest), "manifest.proto");
  zipfile.addBuffer(Buffer.from(JSON.stringify(manifest, null, 2)), "manifest.json");
  zipfile.addBuffer(
    Buffer.from(
      `This is a portable Signal sticker pack bundle exported from ${url.origin}, not a live Signal pack link.\n\n` +
        `manifest.proto is encoded per Signal's real StickerPack schema ` +
        `(signalapp/Signal-Desktop sticker-creator/protos/Stickers.proto), and manifest.json mirrors the same ` +
        `data for tools that prefer JSON. moji.blue has no Signal API credentials to publish this pack directly ` +
        `to Signal's sticker service — use a Signal-compatible packaging tool (e.g. sticker-convert) with these ` +
        `files to actually publish it.\n`,
      "utf-8",
    ),
    "README.txt",
  );

  zipfile.end();

  const chunks: Buffer[] = [];
  for await (const chunk of zipfile.outputStream) chunks.push(chunk as Buffer);
  const zipBuffer = Buffer.concat(chunks);

  const filename = `${(pack.name as string).replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.signal-stickers.zip`;
  return new Response(zipBuffer, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
};
