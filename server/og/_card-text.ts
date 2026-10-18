// Text and image helpers for the OG (link-preview) cards.
//
// The card renderer (Satori → Resvg) only has hatk's bundled Inter-Regular,
// which is a small subset (Basic Latin, Latin-1 and a handful of
// punctuation/symbols). Any character outside it is drawn as Satori's
// "NO GLYPH" box, so user-supplied text — pack names, descriptions, handles —
// is reduced to what the font can draw before it reaches the renderer.
import { safeFetch, type Lookup } from "../../app/lib/server/safe-fetch.ts";

/**
 * Code point ranges present in Inter-Regular.woff (inclusive). Generated from
 * the font's cmap; _card-text.test.ts re-derives it and fails if hatk ships a
 * different font, so update both together.
 */
export const INTER_RANGES: readonly (readonly [number, number])[] = [
  [32, 126],
  [160, 172],
  [174, 255],
  [305, 305],
  [338, 339],
  [8211, 8212],
  [8216, 8218],
  [8220, 8222],
  [8226, 8226],
  [8230, 8230],
  [8242, 8243],
  [8249, 8250],
  [8260, 8260],
  [8364, 8364],
  [8482, 8482],
  [8593, 8593],
  [8595, 8595],
];

export function canRender(cp: number): boolean {
  for (const [lo, hi] of INTER_RANGES) {
    if (cp < lo) return false; // ranges are sorted
    if (cp <= hi) return true;
  }
  return false;
}

// Letters NFD can't decompose, mapped to the nearest plain letters
const FOLD: Record<string, string> = {
  ł: "l",
  Ł: "L",
  đ: "d",
  Đ: "D",
  ħ: "h",
  Ħ: "H",
  ŧ: "t",
  Ŧ: "T",
  ŀ: "l",
  Ŀ: "L",
  ĳ: "ij",
  Ĳ: "IJ",
  ŉ: "n",
};

/**
 * Reduce text to what the card font can draw: unsupported letters are folded
 * to a plain equivalent where one exists ("Łódź" → "Lodz"), and anything else
 * (emoji, CJK, Arabic, Greek, Cyrillic, …) is dropped. Newlines and runs of
 * whitespace collapse to single spaces.
 */
export function cardText(text: string | null | undefined): string {
  let out = "";
  for (const ch of (text ?? "").normalize("NFC")) {
    const cp = ch.codePointAt(0)!;
    if (/\s/u.test(ch)) {
      out += " ";
    } else if (canRender(cp)) {
      out += ch;
    } else {
      const folded = FOLD[ch] ?? ch.normalize("NFD").replace(/\p{M}+/gu, "");
      for (const f of folded) if (canRender(f.codePointAt(0)!)) out += f;
    }
  }
  return out.replace(/ {2,}/g, " ").trim();
}

/** `text` cut to at most `max` characters, with an ellipsis (which Inter has) if it was longer. */
export function clip(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max
    ? text
    : chars
        .slice(0, max - 1)
        .join("")
        .trimEnd() + "…";
}

// ---- images

export const MAX_CARD_IMAGE_BYTES = 512_000;
const FETCH_TIMEOUT_MS = 5000;

function sniff(b: Uint8Array): "image/png" | "image/jpeg" | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return null;
}

/**
 * Fetch a PNG or JPEG for embedding in a card, as a data URL — or null.
 * Only those two types are accepted, identified by their bytes rather than the
 * Content-Type (Satori can't draw WebP, and an SVG here would be
 * attacker-controlled markup handed to the renderer), with a size cap and a
 * timeout so one slow or hostile blob can't stall or bloat the card.
 */
export async function fetchCardImage(
  url: string,
  fetchFn?: typeof fetch,
  lookup?: Lookup,
): Promise<string | null> {
  try {
    // The PDS host comes from a DID document anyone can write: SSRF-guarded,
    // size-capped while streaming, no redirects into private space.
    const { res, body: bytes } = await safeFetch(
      url,
      {},
      {
        maxBytes: MAX_CARD_IMAGE_BYTES,
        timeoutMs: FETCH_TIMEOUT_MS,
        fetch: fetchFn,
        lookup,
        allowLocal: process.env.NODE_ENV !== "production",
      },
    );
    if (!res.ok) return null;
    const type = sniff(bytes);
    return type ? `data:${type};base64,${Buffer.from(bytes).toString("base64")}` : null;
  } catch {
    return null;
  }
}
