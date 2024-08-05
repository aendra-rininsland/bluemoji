import AtpAgent, {
  RichTextSegment,
  RichText,
  AppBskyRichtextFacet
} from "@atproto/api";
import * as BlueMojiRichtextFacet from "@aendra/lexicons/types/blue/moji/richtext/facet";
import * as BlueMojiCollectionItem from "@aendra/lexicons/types/blue/moji/collection/item";
import { detectFacets } from "./detect-facets";
import { BluemojiRichTextSegment, facetSort } from "./bluemoji";

export const register = (did?: string) => {
  Object.defineProperty(RichTextSegment, "bluemoji", {
    get(): BlueMojiRichtextFacet.Bluemoji | undefined {
      const bluemoji = this.facet?.features.find(
        BlueMojiRichtextFacet.isBluemoji
      );
      if (BlueMojiRichtextFacet.isBluemoji(bluemoji)) {
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
          if (BlueMojiRichtextFacet.isBluemoji(feature)) {
            const session = agent.session;
            if (!session) return;

            const { did: repo } = session;

            const { data: record } = await agent.com.atproto.repo.getRecord({
              repo,
              rkey: feature.name.replace(/:/g, ""),
              collection: "blue.moji.collection"
            });

            if (!record || !BlueMojiCollectionItem.isRecord(record)) return;

            if (BlueMojiCollectionItem.isBlobAsset(record.asset)) {
              const { ref, mimeType } = record.asset.file;
              const [, format = "png"] = mimeType?.split("/");
              feature.uri = `https://cdn.bsky.app/img/feed_fullsize/plain/${repo}/${ref}@${format.toUpperCase()}`;
            } else if (BlueMojiCollectionItem.isBytesAsset(record.asset)) {
              feature.uri = `data:image/png;base64,${btoa(String.fromCharCode.apply(null, record.asset.file?.bytes))}`;
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
