/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as AppBskyActorDefs from "../../../app/bsky/actor/defs.js";
import type * as BlueMojiFeedReaction from "./reaction.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.feed.defs";

/** A single reaction by a single actor. */
export interface ReactionView {
  $type?: "blue.moji.feed.defs#reactionView";
  uri: string;
  actor: AppBskyActorDefs.ProfileViewBasic;
  emoji: BlueMojiFeedReaction.EmojiRef;
  createdAt: string;
}

const hashReactionView = "reactionView";

export function isReactionView<V>(v: V) {
  return is$typed(v, id, hashReactionView);
}

export function validateReactionView<V>(v: V) {
  return validate<ReactionView & V>(v, id, hashReactionView);
}

/** Aggregated reactions to a subject, grouped by emoji item URI. */
export interface ReactionGroup {
  $type?: "blue.moji.feed.defs#reactionGroup";
  emoji: BlueMojiFeedReaction.EmojiRef;
  count: number;
  /** AT-URI of the requesting account's reaction record in this group, if any. Enables un-reacting. */
  viewer?: string;
}

const hashReactionGroup = "reactionGroup";

export function isReactionGroup<V>(v: V) {
  return is$typed(v, id, hashReactionGroup);
}

export function validateReactionGroup<V>(v: V) {
  return validate<ReactionGroup & V>(v, id, hashReactionGroup);
}
