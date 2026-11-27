const B32 = "abcdefghijklmnopqrstuvwxyz234567";

/**
 * The SHA-256 digest inside an ATProto blob CID, or null if it isn't one.
 * Blob CIDs are fixed by the spec: CIDv1, `raw` codec (0x55), sha2-256, in
 * lower-case base32 multibase (`bafkrei…`), i.e. bytes 01 55 12 20 <32 bytes>.
 */
export function blobCidDigest(cid: string): Uint8Array | null {
  const c = cid.toLowerCase();
  if (c[0] !== "b") return null;
  let bits = 0;
  let acc = 0;
  const out: number[] = [];
  for (const ch of c.slice(1)) {
    const v = B32.indexOf(ch);
    if (v < 0) return null;
    acc = (acc << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  if (
    out.length !== 36 ||
    out[0] !== 0x01 ||
    out[1] !== 0x55 ||
    out[2] !== 0x12 ||
    out[3] !== 0x20
  ) {
    return null;
  }
  return Uint8Array.from(out.slice(4));
}

/** Whether `bytes` hash (SHA-256) to `digest`. Uses Web Crypto, so it runs on Workers, Node, Deno and Bun. */
export async function sha256Matches(bytes: Uint8Array, digest: Uint8Array): Promise<boolean> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
  if (hash.length !== digest.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ digest[i];
  return diff === 0;
}
