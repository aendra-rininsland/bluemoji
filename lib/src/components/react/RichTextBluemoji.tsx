/**
 * @file
 * React-based renderer for Bluemoji
 */
import React, { useState, useEffect } from "react";
import { Image, StyleSheet, AccessibilityInfo } from "react-native";
import * as BlueMojiRichtextFacet from "@aendra/lexicons/types/blue/moji/richtext/facet";
import * as BlueMojiCollectionItem from "@aendra/lexicons/types/blue/moji/collection/item";

const styles = StyleSheet.create({
  emoji16: {
    width: 16,
    height: 16
  }
});

export const RichTextBluemoji = ({
  bluemoji
}: {
  bluemoji: BlueMojiRichtextFacet.Bluemoji;
  style?: { width: string; height: string };
}) => {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    const reduceMotionChangedSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (isReduceMotionEnabled) => {
        setReduceMotionEnabled(isReduceMotionEnabled);
      }
    );
    AccessibilityInfo.isReduceMotionEnabled().then((isReduceMotionEnabled) => {
      setReduceMotionEnabled(isReduceMotionEnabled);
    });

    return reduceMotionChangedSubscription.remove;
  }, []);

  if (BlueMojiCollectionItem.isBlobAsset(bluemoji.asset)) {
    const { uri } = bluemoji;
    const [did] = uri.replace(/^at:\/\//, "").split("/");
    const { ref, mimeType } = bluemoji.asset.file;
    const [, format = "jpeg"] = mimeType?.split("/");
    const cdnUri = `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${ref}@${format}`;
    return <Image style={styles.emoji16} source={{ uri: cdnUri }} />;
  } else if (BlueMojiCollectionItem.isBytesAsset(bluemoji.asset)) {
    // TODO does btoa work in RN?

    const dataUri = `data:image/apng;base64,${btoa(String.fromCharCode.apply(null, bluemoji.asset.file?.bytes))}`;

    return reduceMotionEnabled ? null : (
      <Image style={styles.emoji16} source={{ uri: dataUri }} />
    );
  }

  return null;
};
