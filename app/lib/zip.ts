// Minimal in-browser ZIP reader (no dependencies): lists entries from the
// central directory and inflates individual entries with the platform's
// DecompressionStream. Reads via Blob.slice, so a large archive is never
// loaded into memory whole. Deliberately small: stored + deflate only, no
// ZIP64, no encryption — enough for emoji packs, and everything else fails
// with a clear message rather than misbehaving.
//
// Hostile-input hygiene: entry counts, declared sizes and inflated output are
// all capped (a "zip bomb" can't expand past the declared size), and every
// inflated entry is CRC-checked.

export class ZipError extends Error {}

export interface ZipEntry {
  name: string;
  /** 0 = stored, 8 = deflate */
  method: number;
  encrypted: boolean;
  crc32: number;
  compressedSize: number;
  size: number;
  /** Offset of the local file header */
  offset: number;
  directory: boolean;
}

export const MAX_ENTRIES = 5000;
const MAX_CENTRAL_DIRECTORY_BYTES = 32_000_000;

const EOCD_SIG = 0x06054b50;
const ZIP64_LOCATOR_SIG = 0x07064b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

// ---- CRC-32 (IEEE) ----
let crcTable: Uint32Array | null = null;
export function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

async function readRange(file: Blob, start: number, end: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(start, end).arrayBuffer());
}

function decodeName(bytes: Uint8Array, utf8Flag: boolean): string {
  if (utf8Flag) return new TextDecoder("utf-8").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Legacy archives (old Windows zippers) use a local code page; windows-1252
    // is the best single guess and only affects non-ASCII file names.
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** List the entries of a zip archive (directories included). */
export async function listZip(file: Blob, maxEntries = MAX_ENTRIES): Promise<ZipEntry[]> {
  if (file.size < 22) throw new ZipError("That doesn't look like a zip file");

  // End-of-central-directory record: within the last 64 KiB + 22 bytes
  const tailStart = Math.max(0, file.size - (0xffff + 22));
  const tail = await readRange(file, tailStart, file.size);
  const tv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tv.getUint32(i, true) === EOCD_SIG && i + 22 + tv.getUint16(i + 20, true) <= tail.length) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new ZipError("That doesn't look like a zip file");

  if (eocd >= 20 && tv.getUint32(eocd - 20, true) === ZIP64_LOCATOR_SIG) {
    throw new ZipError("ZIP64 archives aren't supported");
  }
  const diskEntries = tv.getUint16(eocd + 8, true);
  const total = tv.getUint16(eocd + 10, true);
  const cdSize = tv.getUint32(eocd + 12, true);
  const cdOffset = tv.getUint32(eocd + 16, true);
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw new ZipError("ZIP64 archives aren't supported");
  }
  if (tv.getUint16(eocd + 4, true) !== 0 || diskEntries !== total) {
    throw new ZipError("Multi-part zip archives aren't supported");
  }
  if (total > maxEntries) throw new ZipError(`Too many files in the zip (max ${maxEntries})`);
  if (cdSize > MAX_CENTRAL_DIRECTORY_BYTES || cdOffset + cdSize > file.size) {
    throw new ZipError("The zip file is corrupt");
  }

  const cd = await readRange(file, cdOffset, cdOffset + cdSize);
  const dv = new DataView(cd.buffer, cd.byteOffset, cd.byteLength);
  const entries: ZipEntry[] = [];
  let pos = 0;
  for (let n = 0; n < total; n++) {
    if (pos + 46 > cd.length || dv.getUint32(pos, true) !== CENTRAL_SIG) {
      throw new ZipError("The zip file is corrupt");
    }
    const flags = dv.getUint16(pos + 8, true);
    const nameLen = dv.getUint16(pos + 28, true);
    const extraLen = dv.getUint16(pos + 30, true);
    const commentLen = dv.getUint16(pos + 32, true);
    if (pos + 46 + nameLen + extraLen + commentLen > cd.length) {
      throw new ZipError("The zip file is corrupt");
    }
    const name = decodeName(cd.subarray(pos + 46, pos + 46 + nameLen), (flags & 0x800) !== 0);
    const size = dv.getUint32(pos + 24, true);
    entries.push({
      name,
      method: dv.getUint16(pos + 10, true),
      encrypted: (flags & 0x1) !== 0,
      crc32: dv.getUint32(pos + 16, true),
      compressedSize: dv.getUint32(pos + 20, true),
      size,
      offset: dv.getUint32(pos + 42, true),
      directory: name.endsWith("/"),
    });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Inflate one entry, refusing to produce more than `maxBytes`. */
export async function extractEntry(
  file: Blob,
  entry: ZipEntry,
  maxBytes: number,
): Promise<Uint8Array> {
  if (entry.encrypted) throw new ZipError("password-protected files aren't supported");
  if (entry.method !== 0 && entry.method !== 8) {
    throw new ZipError(`unsupported compression method (${entry.method})`);
  }
  if (entry.size > maxBytes) throw new ZipError("file is too large");

  const header = await readRange(file, entry.offset, entry.offset + 30);
  const hv = new DataView(header.buffer, header.byteOffset, header.byteLength);
  if (header.length < 30 || hv.getUint32(0, true) !== LOCAL_SIG) {
    throw new ZipError("The zip file is corrupt");
  }
  const dataStart = entry.offset + 30 + hv.getUint16(26, true) + hv.getUint16(28, true);
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > file.size) throw new ZipError("The zip file is corrupt");
  const compressed = file.slice(dataStart, dataEnd);

  let out: Uint8Array;
  if (entry.method === 0) {
    if (entry.compressedSize !== entry.size) throw new ZipError("The zip file is corrupt");
    out = new Uint8Array(await compressed.arrayBuffer());
  } else {
    if (typeof DecompressionStream === "undefined") {
      throw new ZipError(
        "This browser can't unzip files — try a current Chrome, Firefox or Safari",
      );
    }
    const reader = compressed
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"))
      .getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        // Never trust the declared size: stop inflating as soon as we pass it
        if (total > entry.size) throw new ZipError("The zip file is corrupt");
        chunks.push(value);
      }
    } catch (e) {
      await reader.cancel().catch(() => {});
      throw e instanceof ZipError ? e : new ZipError("The zip file is corrupt");
    }
    out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
  }

  if (out.length !== entry.size || crc32(out) !== entry.crc32) {
    throw new ZipError("The zip file is corrupt (checksum mismatch)");
  }
  return out;
}
