// Pack text limits, mirroring lexicons/blue/moji/packs/pack.json.
export const PACK_NAME_MAX_BYTES = 64; // lexicon maxLength counts UTF-8 bytes, not characters
export const PACK_DESCRIPTION_MAX_GRAPHEMES = 300;
export const PACK_DESCRIPTION_MAX_BYTES = 3000;

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** User-perceived character count (what the lexicon's maxGraphemes measures). */
export function graphemeCount(text: string): number {
  if (!segmenter) return [...text].length;
  let n = 0;
  for (const _ of segmenter.segment(text)) n++;
  return n;
}

/** Human-readable problem with a pack description, or null if it's fine to save. */
export function packDescriptionError(description: string): string | null {
  if (graphemeCount(description) > PACK_DESCRIPTION_MAX_GRAPHEMES) {
    return `Description is too long (max ${PACK_DESCRIPTION_MAX_GRAPHEMES} characters)`;
  }
  if (new TextEncoder().encode(description).length > PACK_DESCRIPTION_MAX_BYTES) {
    return "Description is too long (too many bytes — try fewer emoji or symbols)";
  }
  return null;
}

/** Human-readable problem with a pack name, or null if it's fine to save. */
export function packNameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Give the pack a name";
  if (new TextEncoder().encode(trimmed).length > PACK_NAME_MAX_BYTES) {
    return `Name is too long (max ${PACK_NAME_MAX_BYTES} bytes — about ${PACK_NAME_MAX_BYTES} letters, fewer for non-Latin text or emoji)`;
  }
  return null;
}

export interface PackTarget {
  mode: "none" | "existing" | "new";
  /** AT-URI of the chosen pack, when mode is "existing" */
  uri: string;
  name: string;
  description: string;
  /** Applied to a newly created pack */
  license?: string;
  source?: string;
}

/** What's wrong with the chosen pack destination, or null if it's usable (or there is none). */
export function packTargetProblem(t: PackTarget): string | null {
  if (t.mode === "existing") return t.uri ? null : "Choose a pack";
  if (t.mode === "new") return packNameError(t.name) ?? packDescriptionError(t.description);
  return null;
}
