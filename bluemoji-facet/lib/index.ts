import AtpAgent, {
  RichTextProps,
  RichTextSegment,
  RichText,
  Facet,
  TRAILING_PUNCTUATION_REGEX,
} from "@atproto/api";
import { detectFacets as detectFacetsOriginal } from "@atproto/api/src/rich-text/detection";
import { UnicodeString } from "@atproto/api/src/rich-text/unicode";
import * as DevAendraBskyRichtext from "./DevAendraBskyRichtext";
import mfm from "mfm-js";

export class MFMEnabledRichTextSegment extends RichTextSegment {
  get mfm(): FacetMFM | undefined {
    const fn = this.facet?.features.find(DevAendraBskyRichtext.isMFM);
    if (DevAendraBskyRichtext.isMFM(fn)) {
      return fn;
    }
    return undefined;
  }
  isMFM() {
    return !!this.mfm;
  }
}

interface FacetMFM {}

export function detectFacets(text: UnicodeString): Facet[] | undefined {
  const facets = detectFacetsOriginal(text) || [];
  const parsedMfm = mfm.parse(text.toString());
  for (const tag of parsedMfm) {
    // while ((match = re.exec(text.utf16))) {
    //   const leading = match[1]
    //   let tag = match[2]
    //   if (!tag) continue
    //   // strip ending punctuation and any spaces
    //   tag = tag.trim().replace(TRAILING_PUNCTUATION_REGEX, '')
    //   if (tag.length === 0 || tag.length > 64) continue
    //   const index = match.index + leading.length
    //   facets.push({
    //     index: {
    //       byteStart: text.utf16IndexToUtf8Index(index),
    //       byteEnd: text.utf16IndexToUtf8Index(index + 1 + tag.length),
    //     },
    //     features: [
    //       {
    //         $type: 'app.bsky.richtext.facet#tag',
    //         tag: tag,
    //       },
    //     ],
    //   })
    // }
  }

  return facets.length ? facets : undefined;
}
const facetSort = (a: Facet, b: Facet) => a.index.byteStart - b.index.byteStart;

export default () => {
  Object.defineProperty(RichTextSegment, "mfm", {
    get(): FacetMFM | undefined {
      const fn = this.facet?.features.find(DevAendraBskyRichtext.isMFM);
      if (DevAendraBskyRichtext.isMFM(fn)) {
        return fn;
      }
      return undefined;
    },
  });

  (RichTextSegment as unknown as MFMEnabledRichTextSegment).isMFM =
    function () {
      return !!this.mfm;
    };

  RichText.prototype.detectFacets = async function (agent: AtpAgent) {
    this.facets = detectFacets(this.unicodeText);
    if (this.facets) {
      for (const facet of this.facets) {
        for (const feature of facet.features) {
          if (DevAendraBskyRichtext.isMFM(feature)) {
            // const did = await agent
            //   .resolveHandle({ handle: feature.did })
            //   .catch((_) => undefined)
            //   .then((res) => res?.data.did)
            // feature.did = did || ''
          }
        }
      }
      this.facets.sort(facetSort);
    }
  };
};
