import AtpAgent, {
  RichTextSegment,
  RichText,
  Facet,
  AppBskyRichtextFacet
} from "@atproto/api";
import * as BlueMojiRichtextFacet from "../../lexicons/types/blue/moji/richtext/facet";
import * as BlueMojiCollectionItem from "../../lexicons/types/blue/moji/collection/item";
import * as BlueMojiCollectionDefs from "../../lexicons/types/blue/moji/collection/defs";
import { detectFacets } from "./detect-facets";

export const BLUEMOJI_REGEX = new RegExp(
  ":((?!.*--)[A-Za-z0-9-]{4,20}(?<!-)):",
  "gim"
);

export class BluemojiEnabledRichTextSegment extends RichTextSegment {
  get bluemoji(): BlueMojiRichtextFacet.Bluemoji | undefined {
    const fn = this.facet?.features.find(BlueMojiRichtextFacet.isBluemoji);
    if (BlueMojiRichtextFacet.isBluemoji(fn)) {
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

  (RichTextSegment as unknown as BluemojiEnabledRichTextSegment).isBluemoji =
    function () {
      return !!this.bluemoji;
    };

  RichText.prototype.detectFacets = async function (agent: AtpAgent) {
    this.facets = detectFacets(this.unicodeText);
    if (this.facets) {
      for (const facet of this.facets) {
        for (const feature of facet.features) {
          if (BlueMojiRichtextFacet.isBluemoji(feature)) {
            const repo = agent.session?.did;
            if (!repo) return;

            const { data: record } = await agent.com.atproto.repo.getRecord({
              repo,
              rkey: feature.name.slice(1, -1),
              collection: "blue.moji.collection.item"
            });

            if (!record || !BlueMojiCollectionItem.isRecord(record)) return;

            if (BlueMojiCollectionItem.isBlobAsset(record.asset)) {
              const { ref, mimeType } = record.asset.file;
              const [, format = "png"] = mimeType?.split("/");
              feature.uri = `https://cdn.bsky.app/img/feed_fullsize/plain/${repo}/${ref}@${format.toUpperCase()}`;
            } else if (BlueMojiCollectionItem.isBytesAsset(record.asset)) {
              feature.uri = `data:image/apng;base64,${btoa(String.fromCharCode.apply(null, record.asset.file?.bytes))}`;
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
