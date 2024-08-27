import * as BlueMojiCollectionItem from "../../../lexicon/types/blue/moji/collection/item";
import React, { CSSProperties } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export const BluemojiNotAvailable = ({
  style = {},
  className = "bluemoji bluemoji-not-available",
  label = "This Bluemoji cannot be rendered."
}: {
  style?: CSSProperties;
  className?: string;
  label?: string;
}) => (
  <abbr style={style} className={className} title={label}>
    ◌
  </abbr>
);

export const Bluemoji = ({
  item,
  did,
  width = 128,
  height = 128,
  cdnBase = "https://cdn.bsky.app/img/avatar_thumbnail/plain/",
  style = {},
  className = "bluemoji"
}: {
  item: BlueMojiCollectionItem.Record;
  did: string;
  width?: 128;
  height?: 128;
  cdnBase?: string;
  style?: CSSProperties;
  className?: string;
}) => {
  if (!BlueMojiCollectionItem.isRecord(item) || !did) {
    console.log("Invalid record passed to Bluemoji renderer");
    return <BluemojiNotAvailable />;
  }

  if (BlueMojiCollectionItem.isFormats_v0(item.formats)) {
    if (item.formats.lottie) {
      return (
        <DotLottieReact
          loop
          autoplay
          data={item.formats.lottie}
          className={className}
          style={style}
        />
      );
    } else if (item.formats.apng_128) {
      const blob = new Blob([item.formats.apng_128], { type: "image/png" });
      const data = URL.createObjectURL(blob);
      return (
        <img
          src={data}
          width={width}
          height={height}
          style={style}
          className={className}
        />
      );
    } else {
      const cid =
        item.formats.png_128?.ref ||
        item.formats.webp_128?.ref ||
        item.formats.gif_128?.ref;

      if (!cid) {
        console.error(
          `Invalid Bluemoji v0 blob format detected on ${did}/blue.moji.collection.item/${item.name}`
        );

        return <BluemojiNotAvailable />;
      }

      const uri = `${cdnBase}/${did}/${cid}@PNG`;

      return (
        <img
          src={uri}
          width={width}
          height={height}
          style={style}
          className={className}
        />
      );
    }
  }
};
