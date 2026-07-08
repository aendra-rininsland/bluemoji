import { Facet, UnicodeString } from "@atproto/api";
import { BLUEMOJI_REGEX } from "./BluemojiRichText";

// @atproto/api does not publicly export its mention/link/tag facet detector
// (only UnicodeString is on the public entry) — the only way to reach it is
// this deep import into @atproto/api's own TypeScript source, which resolves
// only in bundler contexts that transpile on the fly (Vite, Metro,
// webpack+ts-loader, etc). Deferred as a dynamic import so a plain Node ESM
// consumer can still load and use the rest of this package (rendering
// existing facets, alias helpers, etc); only calling detectFacets() itself
// outside a bundler throws. This is an upstream @atproto/api limitation, not
// something fixable here without reimplementing mention/link/tag detection.
export async function detectFacets(text: UnicodeString): Promise<Facet[] | undefined> {
  const { detectFacets: detectFacetsOriginal } =
    await import("@atproto/api/src/rich-text/detection");
  let match: any;
  const facets: Facet[] = detectFacetsOriginal(text) || [];
  {
    const re = BLUEMOJI_REGEX;
    while ((match = re.exec(text.utf16))) {
      const start = text.utf16.indexOf(match[0], match.index) - 1;
      facets.push({
        $type: "app.bsky.richtext.facet",
        index: {
          byteStart: text.utf16IndexToUtf8Index(start),
          byteEnd: text.utf16IndexToUtf8Index(start + match[0].length + 1),
        },
        features: [
          {
            $type: "blue.moji.richtext.facet",
            name: match[0],
          },
        ],
      });
    }
  }
  return facets.length > 0 ? facets : undefined;
}
