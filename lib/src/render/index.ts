/**
 * @file
 * This facilitates rendering of Bluemoji in a variety of formats
 */

import * as BlueMojiRichTextFacet from "@aendra/lexicons/types/blue/moji/richtext/facet";
import * as BlueMojiCollectionItem from "@aendra/lexicons/types/blue/moji/collection/item";
import { renderLottie } from "./renderers/lottie";
import { renderApngAsImg } from "./renderers/apng";
import { renderBlobAsImg, BlobTypeEnum } from "./renderers/blob";
import { AtpAgent } from "@atproto/api";

export async function render(
  agent: AtpAgent,
  facet: BlueMojiRichTextFacet.Main,
  params: { raw: boolean; player: boolean } = { raw: false, player: false }
) {
  try {
    if (BlueMojiRichTextFacet.isFormats_v0(facet.formats)) {
      const { formats } = facet;
      if (formats.lottie || formats.apng_128) {
        const { data } = await agent.com.atproto.repo.getRecord({
          repo: facet.did,
          collection: "blue.moji.collection.item",
          rkey: facet.name.replace(/:/g, "")
        });

        const { value: record } = data;

        if (
          BlueMojiCollectionItem.isRecord(record) &&
          BlueMojiCollectionItem.isFormats_v0(record.formats)
        ) {
          const bytes = record.formats.lottie || record.formats.apng_128;
          if (!bytes) throw new Error("Invalid bytes in record");

          if (formats.lottie) {
            console.log(bytes, params);
            return renderLottie(bytes, params);
          } else if (formats.apng_128) {
            return renderApngAsImg(bytes);
          }
        }

        throw new Error("Invalid Bluemoji");
      } else if (formats.gif) {
        return renderBlobAsImg(facet, BlobTypeEnum.GIF);
      } else if (formats.webp_128) {
        return renderBlobAsImg(facet, BlobTypeEnum.WEBP);
      } else if (formats.png_128) {
        return renderBlobAsImg(facet, BlobTypeEnum.PNG);
      }

      throw new Error("Invalid format attempted to render");
    }
  } catch (e) {
    console.error(e);
  }
}
