// Emoji descriptions ("alt text") — what screen readers announce and what
// shows on hover. The item lexicon sets no limit; this is a UI-side cap.
import { graphemeCount } from "./packs";

export const ALT_MAX_GRAPHEMES = 500;

/** Description used when the user doesn't write one: the humanised name (`blobcat_happy` → "blobcat happy"). */
export function defaultAlt(name: string): string {
  return name
    .replace(/^:+|:+$/g, "")
    .replace(/[_.-]+/g, " ")
    .trim();
}

/** What's wrong with a description, or null if it's fine (empty is fine). */
export function altError(alt: string): string | null {
  return graphemeCount(alt.trim()) > ALT_MAX_GRAPHEMES
    ? `Description is too long (max ${ALT_MAX_GRAPHEMES} characters)`
    : null;
}
