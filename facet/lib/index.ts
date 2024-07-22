import AtpAgent, { RichTextSegment, RichText, Facet } from "@atproto/api";
import { detectFacets as detectFacetsOriginal } from "@atproto/api/src/rich-text/detection";
import { UnicodeString } from "@atproto/api/src/rich-text/unicode";
import * as DevAendraBskyFacet from "./lexicon/types/dev/aendra/bsky/facet";
import * as DevAendraBskyBluemoji from "./lexicon/types/dev/aendra/bsky/bluemoji";

export const BLUEMOJI_REGEX = /:((?!.*--)[A-Za-z0-9-]{4,20}(?<!-)):/gim;

export class BluemojiEnabledRichTextSegment extends RichTextSegment {
  get bluemoji(): FacetBluemoji | undefined {
    const fn = this.facet?.features.find(DevAendraBskyFacet.isBluemoji);
    if (DevAendraBskyFacet.isBluemoji(fn)) {
      return fn;
    }
    return undefined;
  }
  isBluemoji() {
    return !!this.bluemoji;
  }
}

interface FacetBluemoji {}

export function detectFacets(text: UnicodeString): Facet[] | undefined {
  let match: any;
  const facets: Facet[] = detectFacetsOriginal(text) || [];
  {
    const re = BLUEMOJI_REGEX;
    while ((match = re.exec(text.utf16))) {
      const start = text.utf16.indexOf(match[0], match.index) - 1;
      facets.push({
        $type: "dev.aendra.bsky.facet",
        index: {
          byteStart: text.utf16IndexToUtf8Index(start),
          byteEnd: text.utf16IndexToUtf8Index(start + match[0].length + 1)
        },
        features: [
          {
            $type: "dev.aendra.bsky.richtext.facet#bluemoji",
            name: match[0]
          }
        ]
      });
    }
  }
  return facets.length > 0 ? facets : undefined;
}

const facetSort = (a: Facet, b: Facet) => a.index.byteStart - b.index.byteStart;

export default () => {
  Object.defineProperty(RichTextSegment, "bluemoji", {
    get(): FacetBluemoji | undefined {
      const bluemoji = this.facet?.features.find(DevAendraBskyFacet.isBluemoji);
      if (DevAendraBskyFacet.isBluemoji(bluemoji)) {
        return bluemoji;
      }
      return undefined;
    }
  });

  (RichTextSegment as unknown as BluemojiEnabledRichTextSegment).isBluemoji =
    function () {
      return !!this.bluemoji;
    };

  RichText.prototype.detectFacets = async function (agent: AtpAgent) {
    this.facets = detectFacets(this.unicodeText);
    if (this.facets) {
      for (const facet of this.facets) {
        for (const feature of facet.features) {
          if (DevAendraBskyFacet.isBluemoji(feature)) {
            const repo =
              feature.did ||
              agent.session?.did ||
              "did:plc:kkf4naxqmweop7dv4l2iqqf5";
            if (!repo) return;

            const { data: bluemojiList } =
              await agent.com.atproto.repo.listRecords({
                repo,
                limit: 100, // @TODO loop through whole collection
                collection: "dev.aendra.bsky.bluemoji"
              });

            const bluemoji = bluemojiList.records.find(
              (d) =>
                (d.value as DevAendraBskyBluemoji.Record).name === feature.name
            );

            if (!bluemoji) return;

            feature.uri = bluemoji.uri;
          }
        }
      }
      this.facets.sort(facetSort);
    }
  };

  return RichText;
};
