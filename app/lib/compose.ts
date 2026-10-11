// Post composer helpers: find :emoji: in text, build the
// blue.moji.richtext.facet entries that make them render inline, and drive
// :autocomplete:. Pure functions so they can be unit-tested.
import { normalizeAlias } from "./alias.ts";

/** An emoji from the viewer's own collection that can be used inline. */
export interface ComposeEmoji {
  uri: string;
  cid: string;
  did: string;
  /** Colon-wrapped, as stored: ":blobcat:" */
  name: string;
  alt?: string;
  adultOnly?: boolean;
  /** CIDs of the inline renditions (png_128, webp_128, gif_128, apng_128, lottie). */
  formatCids: Record<string, string>;
}

// Like BLUEMOJI_REGEX in lib/src/facet/BluemojiRichText.ts (kept local: that
// module pulls in @atproto/api), but allows one-character names such as :猫:.
// Skips pure-number "aliases" so clock times like 12:30:45 aren't emoji.
const EMOJI_TOKEN = /:(?!\d+:)([^\s:]{1,64}):/gu;

export const INLINE_FORMAT_KEYS = ["png_128", "webp_128", "gif_128", "apng_128", "lottie"] as const;

/** Lookup table from canonical alias to emoji. */
export function emojiByAlias(emoji: ComposeEmoji[]): Map<string, ComposeEmoji> {
  const map = new Map<string, ComposeEmoji>();
  for (const e of emoji) {
    try {
      map.set(normalizeAlias(e.name), e);
    } catch {
      // A legacy record with an unnormalisable name can't be typed anyway
    }
  }
  return map;
}

export interface EmojiMatch {
  /** UTF-16 offsets into the text (for the preview). */
  start: number;
  end: number;
  /** UTF-8 byte offsets (for the facet index). */
  byteStart: number;
  byteEnd: number;
  emoji: ComposeEmoji;
}

/** Every `:alias:` in `text` that names one of the viewer's emoji. */
export function findEmoji(text: string, byAlias: Map<string, ComposeEmoji>): EmojiMatch[] {
  const matches: EmojiMatch[] = [];
  const encoder = new TextEncoder();
  for (const m of text.matchAll(EMOJI_TOKEN)) {
    let alias: string;
    try {
      alias = normalizeAlias(m[1]);
    } catch {
      continue;
    }
    const emoji = byAlias.get(alias);
    if (!emoji || !Object.keys(emoji.formatCids).length) continue;
    const start = m.index!;
    const end = start + m[0].length;
    const byteStart = encoder.encode(text.slice(0, start)).length;
    matches.push({
      start,
      end,
      byteStart,
      byteEnd: byteStart + encoder.encode(m[0]).length,
      emoji,
    });
  }
  return matches;
}

/**
 * app.bsky.richtext.facet entries (one blue.moji.richtext.facet feature each)
 * for the matches. did/name/formats are self-attested by us as the poster;
 * renderers re-verify them against the indexed item.
 */
export function buildEmojiFacets(matches: EmojiMatch[]) {
  return matches.map(({ byteStart, byteEnd, emoji }) => {
    const formats: Record<string, string> = {};
    for (const key of INLINE_FORMAT_KEYS) {
      if (emoji.formatCids[key]) formats[key] = emoji.formatCids[key];
    }
    return {
      $type: "app.bsky.richtext.facet",
      index: { byteStart, byteEnd },
      features: [
        {
          $type: "blue.moji.richtext.facet",
          did: emoji.did,
          name: emoji.name,
          ...(emoji.alt ? { alt: emoji.alt } : {}),
          ...(emoji.adultOnly ? { adultOnly: true } : {}),
          formats: { $type: "blue.moji.richtext.facet#formats_v1", ...formats },
        },
      ],
    };
  });
}

/** Text/emoji runs for the live preview. */
export type PreviewPart = { text: string } | { emoji: ComposeEmoji };
export function previewParts(text: string, matches: EmojiMatch[]): PreviewPart[] {
  const parts: PreviewPart[] = [];
  let pos = 0;
  for (const m of matches) {
    if (m.start > pos) parts.push({ text: text.slice(pos, m.start) });
    parts.push({ emoji: m.emoji });
    pos = m.end;
  }
  if (pos < text.length) parts.push({ text: text.slice(pos) });
  return parts;
}

/**
 * If the caret sits right after a half-typed `:partial` (at the start of the
 * text or after whitespace), the range to replace and the query so far.
 */
export function autocompleteToken(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const m = /(^|\s):([^\s:]{1,64})$/u.exec(text.slice(0, caret));
  if (!m) return null;
  return { start: caret - m[2].length - 1, query: m[2] };
}

/** Emoji whose alias matches `query`: prefix matches first, then substring. */
export function suggest(emoji: ComposeEmoji[], query: string, limit = 8): ComposeEmoji[] {
  const q = query.toLowerCase();
  const scored: [number, ComposeEmoji][] = [];
  for (const e of emoji) {
    const alias = e.name.replace(/^:|:$/g, "").toLowerCase();
    const idx = alias.indexOf(q);
    if (idx !== -1) scored.push([idx === 0 ? 0 : 1, e]);
  }
  // Prefix matches first, then shorter (closer) names, then alphabetical
  scored.sort(
    (a, b) =>
      a[0] - b[0] || a[1].name.length - b[1].name.length || a[1].name.localeCompare(b[1].name),
  );
  return scored.slice(0, limit).map(([, e]) => e);
}
