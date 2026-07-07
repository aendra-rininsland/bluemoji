/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as AppBskyEmbedDefs from "./defs.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "app.bsky.embed.video";

export interface Main {
  $type?: "app.bsky.embed.video";
  /** Alt text description of the video, for accessibility. */
  alt?: string;
  /** The mp4 video file. May be up to 100mb, formerly limited to 50mb. */
  video: BlobRef;
  captions?: Caption[];
  aspectRatio?: AppBskyEmbedDefs.AspectRatio;
  /** A hint to the client about how to present the video. */
  presentation?: "default" | "gif" | (string & {});
}

const hashMain = "main";

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain);
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain);
}

export interface View {
  $type?: "app.bsky.embed.video#view";
  alt?: string;
  cid: string;
  playlist: string;
  thumbnail?: string;
  aspectRatio?: AppBskyEmbedDefs.AspectRatio;
  /** A hint to the client about how to present the video. */
  presentation?: "default" | "gif" | (string & {});
}

const hashView = "view";

export function isView<V>(v: V) {
  return is$typed(v, id, hashView);
}

export function validateView<V>(v: V) {
  return validate<View & V>(v, id, hashView);
}

export interface Caption {
  $type?: "app.bsky.embed.video#caption";
  file: BlobRef;
  lang: string;
}

const hashCaption = "caption";

export function isCaption<V>(v: V) {
  return is$typed(v, id, hashCaption);
}

export function validateCaption<V>(v: V) {
  return validate<Caption & V>(v, id, hashCaption);
}
