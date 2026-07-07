/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as BlueMojiRichtextFacet from "../richtext/facet.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.feed.reaction";

export interface Main {
  $type: "blue.moji.feed.reaction";
  /** AT-URI of the post being reacted to. */
  subject: string;
  /** CID of the subject post at reaction time, for strong referencing. */
  subjectCid?: string;
  emoji: EmojiRef;
  createdAt: string;
  [k: string]: unknown;
}

const hashMain = "main";

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain);
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true);
}

export { type Main as Record, isMain as isRecord, validateMain as validateRecord };

/** Denormalized reference to the Bluemoji used, mirroring blue.moji.richtext.facet: CID-only formats let consumers build blob/CDN URLs without a getRecord round-trip. AppViews should verify against the indexed item where possible. */
export interface EmojiRef {
  $type?: "blue.moji.feed.reaction#emojiRef";
  /** AT-URI of the blue.moji.collection.item record. The owning DID is derived from this. */
  uri: string;
  /** Colon-wrapped alias, e.g. :blobcat:. Used as fallback text. */
  name: string;
  alt?: string;
  formats:
    | $Typed<BlueMojiRichtextFacet.Formats_v0>
    | $Typed<BlueMojiRichtextFacet.Formats_v1>
    | { $type: string };
}

const hashEmojiRef = "emojiRef";

export function isEmojiRef<V>(v: V) {
  return is$typed(v, id, hashEmojiRef);
}

export function validateEmojiRef<V>(v: V) {
  return validate<EmojiRef & V>(v, id, hashEmojiRef);
}
