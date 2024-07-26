import AtpAgent, {
  RichTextSegment,
  RichText,
  Facet,
  AppBskyRichtextFacet
} from "@atproto/api";
import * as DevAendraRichtextFacet from "./lexicon/types/dev/aendra/richtext/facet";
import * as DevAendraRichtextBluemoji from "./lexicon/types/dev/aendra/richtext/bluemoji";
import { detectFacets } from "./detect-facets";

export const BLUEMOJI_REGEX = /:((?!.*--)[A-Za-z0-9-]{4,20}(?<!-)):/gim;

export class BluemojiEnabledRichTextSegment extends RichTextSegment {
  get bluemoji(): DevAendraRichtextFacet.Bluemoji | undefined {
    const fn = this.facet?.features.find(DevAendraRichtextFacet.isBluemoji);
    if (DevAendraRichtextFacet.isBluemoji(fn)) {
      return fn;
    }
    return undefined;
  }
  isBluemoji() {
    return !!this.bluemoji;
  }
}

const facetSort = (a: Facet, b: Facet) => a.index.byteStart - b.index.byteStart;
export const register = (did?: string) => {
  Object.defineProperty(RichTextSegment, "bluemoji", {
    get(): DevAendraRichtextFacet.Bluemoji | undefined {
      const bluemoji = this.facet?.features.find(
        DevAendraRichtextFacet.isBluemoji
      );
      if (DevAendraRichtextFacet.isBluemoji(bluemoji)) {
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
          if (DevAendraRichtextFacet.isBluemoji(feature)) {
            const repo = feature.did || agent.session?.did || did;
            if (!repo) return;

            const bluemoji = await agent.com.atproto.repo.getRecord({
              repo,
              rkey: feature.name.slice(1, -1),
              collection: "dev.aendra.richtext.bluemoji"
            });

            if (!bluemoji) return;

            feature.did = repo;
            feature.images = bluemoji.data.sizes;
            feature.alt = bluemoji.data.alt;
          } else if (AppBskyRichtextFacet.isMention(feature)) {
            const did = await agent
              .resolveHandle({ handle: feature.did })
              .catch((_) => undefined)
              .then((res) => res?.data.did);
            feature.did = did || "";
          }
        }
      }
      this.facets.sort(facetSort);
    }
  };
};
