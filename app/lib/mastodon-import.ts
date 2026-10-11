// Mastodon flavour of the import pipeline: pulls the source bytes from the
// same-origin /import/mastodon/image proxy, then runs the shared pipeline.
import { importEmoji } from "./emoji-import";
import type { ImportResult } from "./import-runner";

export interface MastodonImportOptions {
  did: string;
  shortcode: string;
  animated: boolean;
  sticker: boolean;
  adultOnly: boolean;
}

export async function importMastodonEmoji(o: MastodonImportOptions): Promise<ImportResult> {
  const res = await fetch(`/import/mastodon/image?shortcode=${encodeURIComponent(o.shortcode)}`);
  if (!res.ok) throw new Error(`Couldn't download image (HTTP ${res.status})`);
  return importEmoji({
    did: o.did,
    name: o.shortcode,
    source: await res.blob(),
    animated: o.animated,
    sticker: o.sticker,
    adultOnly: o.adultOnly,
  });
}
