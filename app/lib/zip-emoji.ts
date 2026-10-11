// Turns a zip archive into emoji candidates for the zip importer: picks out
// the image files, sniffs their real type (never trusting the extension),
// detects animation, and suggests an alias from each file name.
import { isAnimated, sniffImage, type ImageType } from "./image";
import { extractEntry, listZip, ZipError } from "./zip";

/** Per-image cap: the same 1 MB the manual upload page allows. */
export const MAX_IMAGE_BYTES = 1_000_000;
/** Cap on all extracted images together (they're held in memory until import). */
export const MAX_TOTAL_BYTES = 200_000_000;

export interface ZipImage {
  /** Stable id for list keys (index in the archive) */
  id: number;
  /** Full path inside the zip */
  path: string;
  /** File name without folders */
  filename: string;
  blob: Blob;
  type: ImageType;
  animated: boolean;
  /** Default emoji name, derived from the file name */
  suggestedName: string;
}

export interface ZipSkip {
  path: string;
  reason: string;
}

const IMAGE_EXTENSIONS = new Set(["png", "apng", "gif", "webp", "jpg", "jpeg"]);

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/** Files that are archiver/OS metadata, not content: skipped without comment. */
function isJunk(path: string): boolean {
  return (
    path.startsWith("__MACOSX/") ||
    path.includes("/__MACOSX/") ||
    baseName(path).startsWith(".") ||
    baseName(path).toLowerCase() === "thumbs.db"
  );
}

/**
 * Default emoji name for a file: the file name minus its extension, with only
 * the changes needed to be a valid Bluemoji alias (RFC 0005) — whitespace
 * becomes `_`, colons and invisible/control characters are dropped, and a
 * leading/trailing `.`/`_`/`-` is trimmed from plain-ASCII names. Case is
 * kept as written (aliases are case-insensitive; the importer shows the
 * canonical form). The user can edit the result.
 */
export function suggestName(filename: string): string {
  let name = baseName(filename);
  const dot = name.lastIndexOf(".");
  if (dot > 0) name = name.slice(0, dot);
  name = name
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, "_")
    .replace(/:/g, "")
    // Control chars and format chars (bidi marks etc.), but keep ZWJ for emoji sequences
    .replace(/[\p{Cc}\p{Cf}]/gu, (ch) => (ch === "‍" ? ch : ""));
  if (!/[^\x00-\x7f]/.test(name)) name = name.replace(/^[._-]+|[._-]+$/g, "");
  // "--" in positions 3-4 is reserved (punycode-style prefixes)
  if (name.length >= 4 && name[2] === "-" && name[3] === "-") name = name.replace(/-{2,}/g, "-");
  name = [...name].slice(0, 64).join("");
  return name || "emoji";
}

export interface ScanResult {
  images: ZipImage[];
  skipped: ZipSkip[];
}

/** Read a zip and collect every usable image. Throws ZipError if it isn't a readable zip. */
export async function scanEmojiZip(file: Blob): Promise<ScanResult> {
  const entries = await listZip(file);
  const images: ZipImage[] = [];
  const skipped: ZipSkip[] = [];
  let total = 0;

  for (const [id, entry] of entries.entries()) {
    if (entry.directory || isJunk(entry.name)) continue;

    const ext = baseName(entry.name).split(".").pop()?.toLowerCase() ?? "";
    if (ext === "svg") {
      skipped.push({ path: entry.name, reason: "SVG isn't supported" });
      continue;
    }
    if (!IMAGE_EXTENSIONS.has(ext)) {
      skipped.push({ path: entry.name, reason: "not an image file" });
      continue;
    }
    if (entry.size > MAX_IMAGE_BYTES) {
      skipped.push({ path: entry.name, reason: "larger than 1 MB" });
      continue;
    }
    if (total + entry.size > MAX_TOTAL_BYTES) {
      skipped.push({ path: entry.name, reason: "the zip's images are too large overall" });
      continue;
    }

    let bytes: Uint8Array;
    try {
      bytes = await extractEntry(file, entry, MAX_IMAGE_BYTES);
    } catch (e) {
      skipped.push({
        path: entry.name,
        reason: e instanceof ZipError ? e.message : "couldn't be read",
      });
      continue;
    }
    const type = sniffImage(bytes);
    if (!type) {
      skipped.push({ path: entry.name, reason: "not a PNG, GIF, WebP or JPEG image" });
      continue;
    }
    total += bytes.length;
    const filename = baseName(entry.name);
    images.push({
      id,
      path: entry.name,
      filename,
      blob: new Blob([bytes as BlobPart], { type }),
      type,
      animated: isAnimated(bytes, type),
      suggestedName: suggestName(filename),
    });
  }
  return { images, skipped };
}
