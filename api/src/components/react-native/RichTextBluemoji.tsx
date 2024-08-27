/**
 * @file
 * React-based renderer for Bluemoji
 */
import React, { useState, useEffect } from "react";
import { Image, StyleSheet, AccessibilityInfo } from "react-native";
import LottieView from "lottie-react-native";

import * as BlueMojiRichtextFacet from "../../../lexicon/types/blue/moji/richtext/facet";
import * as BlueMojiCollectionItem from "../../../lexicon/types/blue/moji/collection/item";

const styles = StyleSheet.create({
  emoji16: {
    width: 16,
    height: 16
  }
});

export const RichTextBluemoji = ({
  bluemoji
}: {
  bluemoji: BlueMojiRichtextFacet.Main;
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

  if (BlueMojiCollectionItem.isFormats_v0(bluemoji.formats)) {
    const { did, formats } = bluemoji;

    if (formats.lottie) {
      <LottieView
        source={require("../path/to/animation.json")} /* TODO */
        style={{ width: "100%", height: "100%" }} /* TODO */
        autoPlay
        loop
      />;
    } else if (formats.apng_128) {
    } else if (formats.png_128) {
      const cdnUri = `https://cdn.bsky.app/img/avatar_thumbnail/plain/${did}/${formats.png_128}@PNG`;
      return <Image style={styles.emoji16} source={{ uri: cdnUri }} />;
    }
  }

  return null;
};
