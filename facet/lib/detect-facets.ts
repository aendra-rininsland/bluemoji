import { detectFacets as detectFacetsOriginal } from "@atproto/api/src/rich-text/detection";
import { UnicodeString } from "@atproto/api/src/rich-text/unicode";
import { Facet } from "@atproto/api";
import { BLUEMOJI_REGEX } from "./bluemoji";

export function detectFacets(text: UnicodeString): Facet[] | undefined {
  let match: any;
  const facets: Facet[] = detectFacetsOriginal(text) || [];
  {
    const re = BLUEMOJI_REGEX;
    while ((match = re.exec(text.utf16))) {
      const start = text.utf16.indexOf(match[0], match.index) - 1;
      facets.push({
        $type: "dev.aendra.richtext.facet",
        index: {
          byteStart: text.utf16IndexToUtf8Index(start),
          byteEnd: text.utf16IndexToUtf8Index(start + match[0].length + 1)
        },
        features: [
          {
            $type: "dev.aendra.richtext.facet#bluemoji",
            name: match[0]
          }
        ]
      });
    }
  }
  return facets.length > 0 ? facets : undefined;
}
