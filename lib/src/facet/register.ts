import AtpAgent, {
  RichTextSegment,
  RichText,
  AppBskyRichtextFacet
} from "@atproto/api";
import * as BlueMojiRichtextFacet from "@aendra/lexicons/types/blue/moji/richtext/facet";
import * as BlueMojiCollectionItem from "@aendra/lexicons/types/blue/moji/collection/item";
import { detectFacets } from "./detect-facets";
import { BluemojiRichTextSegment, facetSort } from "./BluemojiRichText";

export const register = (did?: string) => {
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
            const session = agent.session;
            if (!session) return;

            const { did: repo } = session;

            const { data: record } = await agent.com.atproto.repo.getRecord({
              repo,
              rkey: feature.name.replace(/:/g, ""),
              collection: "blue.moji.collection"
            });

            if (!record || !BlueMojiCollectionItem.isRecord(record.value))
              return;

            feature.alt = record.value.alt;
            if (
              BlueMojiCollectionItem.isFormats_v0(record.value.formats) &&
              BlueMojiCollectionItem.isBytesOrBlobType_v0(
                record.value.formats.png_128
              ) &&
              record.value.formats.png_128.blob
            ) {
              feature.blobs = {
                $type: "blue.moji.richtext.facet#blobs_v0",
                png_128: record.value.formats.png_128.blob.ref.toString()
              };
            }

            if (typeof record.alt === "string") {
              feature.alt = record.alt;
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
