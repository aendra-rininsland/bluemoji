import * as BlueMojiCollectionItem from "@aendra/lexicons/types/blue/moji/collection/item";
import {
  BskyAgent,
  RichText,
  AppBskyFeedPost,
  AppBskyEmbedExternal
} from "@atproto/api";
import { isLoggedIn, agent } from "../agent";
import { CreateOp } from "../subscription";

const SECONDS = 60;
const TIMEOUT = SECONDS * 60 * 1000;

export const createImagePost = async (emojiRecord: CreateOp) => {
  // Ensure client logged in
  await isLoggedIn;

  // Wait n seconds for Hive to catch up
  await new Promise((res) => setTimeout(res, TIMEOUT));

  // agent.

  const text = "";

  const rt = new RichText({ text });
  await rt.detectFacets(agent);
  const postRecord: AppBskyFeedPost.Record = {
    $type: "app.bsky.feed.post",
    text: rt.text,
    facets: rt.facets,
    createdAt: timestamp,
    embed
  };
};
