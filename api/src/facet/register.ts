import {
  AtpAgent,
  RichTextSegment,
  RichText,
  AppBskyRichtextFacet
} from "@atproto/api";
import * as BlueMojiRichtextFacet from "../../lexicon/types/blue/moji/richtext/facet";
import * as BlueMojiCollectionItem from "../../lexicon/types/blue/moji/collection/item";
import { detectFacets } from "./detect-facets";
import { BluemojiRichTextSegment, facetSort } from "./BluemojiRichText";

export const register = () => {
  Object.defineProperty(RichTextSegment, "bluemoji", {
    get(): BlueMojiRichtextFacet.Main | undefined {
      const bluemoji = this.facet?.features.find(BlueMojiRichtextFacet.isMain);
      if (BlueMojiRichtextFacet.isMain(bluemoji)) {
        return bluemoji;
      }
      return undefined;
    }
  });

  (RichTextSegment as unknown as BluemojiRichTextSegment).isBluemoji =
    function () {
      return !!this.bluemoji;
    };

  RichText.prototype.detectFacets = async function (agent: AtpAgent) {
    this.facets = detectFacets(this.unicodeText);
    if (this.facets) {
      for (const facet of this.facets) {
        for (const feature of facet.features) {
          if (BlueMojiRichtextFacet.isMain(feature)) {
            const { did: repo } = agent?.session || {};

            if (!repo) {
              console.error("Bluemoji facet DID is unknown");
              continue;
            }

            const { data: record } = await agent.com.atproto.repo.getRecord({
              repo,
              rkey: feature.name.replace(/:/g, ""),
              collection: "blue.moji.collection.item"
            });

            if (BlueMojiCollectionItem.isRecord(record.value)) {
              feature.alt = record.value.alt;
              feature.did = repo;
              feature.formats = {
                $type: "blue.moji.richtext.facet#formats_v0"
              };
              if (BlueMojiCollectionItem.isFormats_v0(record.value.formats)) {
                if (record.value.formats.png_128) {
                  feature.formats.png_128 =
                    record.value.formats.png_128.ref.toString();
                }

                if (record.value.formats.apng_128) {
                  feature.formats.apng_128 = !!record.value.formats.apng_128;
                }

                if (record.value.formats.lottie) {
                  feature.formats.lottie = !!record.value.formats.lottie;
                }
              }
            }
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
