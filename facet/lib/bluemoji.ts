import AtpAgent, {
  RichTextSegment,
  RichText,
  Facet,
  AppBskyRichtextFacet
} from "@atproto/api";
import * as DevAendraBskyFacet from "./lexicon/types/dev/aendra/bsky/facet";
import * as DevAendraBskyBluemoji from "./lexicon/types/dev/aendra/bsky/bluemoji";
import { detectFacets } from "./detect-facets";

export const BLUEMOJI_REGEX = /:((?!.*--)[A-Za-z0-9-]{4,20}(?<!-)):/gim;

export class BluemojiEnabledRichTextSegment extends RichTextSegment {
  get bluemoji(): DevAendraBskyFacet.Bluemoji | undefined {
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

const facetSort = (a: Facet, b: Facet) => a.index.byteStart - b.index.byteStart;
export const register = () => {
  Object.defineProperty(RichTextSegment, "bluemoji", {
    get(): DevAendraBskyFacet.Bluemoji | undefined {
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

            let cursor;
            let bluemoji;

            // Loop through repo's emoji until one is found
            while (!bluemoji) {
              try {
                const { data } = await agent.com.atproto.repo.listRecords({
                  repo,
                  limit: 100,
                  collection: "dev.aendra.bsky.bluemoji",
                  cursor
                });

                cursor = data.cursor;

                bluemoji = data.records.find(
                  (d) =>
                    (d.value as DevAendraBskyBluemoji.Record).name ===
                    feature.name
                );

                if (!cursor) break;
              } catch (e) {
                console.error(e);
                break;
              }
            }

            if (!bluemoji) return;

            feature.did = repo;
            feature.cid = bluemoji.cid;
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
