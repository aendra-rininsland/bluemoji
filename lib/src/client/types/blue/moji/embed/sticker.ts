/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as ComAtprotoRepoStrongRef from "../../../com/atproto/repo/strongRef.js";
import type * as AppBskyEmbedDefs from "../../../app/bsky/embed/defs.js";
import type * as ComAtprotoLabelDefs from "../../../com/atproto/label/defs.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.embed.sticker";

/** A full-sized Bluemoji sticker attached to a post as media, in the style of app.bsky.embed.external. References a blue.moji.collection.item record in the sticker owner's repo. */
export interface Main {
  $type?: "blue.moji.embed.sticker";
  sticker: Sticker;
}

const hashMain = "main";

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain);
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain);
}

export interface Sticker {
  $type?: "blue.moji.embed.sticker#sticker";
  record?: ComAtprotoRepoStrongRef.Main;
  /** DID of the repo that owns the sticker record. Combined with the format CIDs to construct blob/CDN URLs without a getRecord round-trip, mirroring blue.moji.richtext.facet. */
  did: string;
  /** Colon-wrapped alias of the source Bluemoji (e.g. :blobcat:). Implementers should use this as fallback text when assets are unavailable. */
  name: string;
  /** Alt text description of the sticker, for accessibility. */
  alt?: string;
  aspectRatio?: AppBskyEmbedDefs.AspectRatio;
  formats: $Typed<Formats_v0> | { $type: string };
}

const hashSticker = "sticker";

export function isSticker<V>(v: V) {
  return is$typed(v, id, hashSticker);
}

export function validateSticker<V>(v: V) {
  return validate<Sticker & V>(v, id, hashSticker);
}

/** CIDs of the full-size (512px-class) blobs stored in the sticker owner's repo under blue.moji.collection.item stickerFormats. CID-only, like blue.moji.richtext.facet#formats_v1, because blobs cannot be referenced across repos. */
export interface Formats_v0 {
  $type?: "blue.moji.embed.sticker#formats_v0";
  png_512?: string;
  webp_512?: string;
  gif_512?: string;
  apng_512?: string;
  lottie?: string;
}

const hashFormats_v0 = "formats_v0";

export function isFormats_v0<V>(v: V) {
  return is$typed(v, id, hashFormats_v0);
}

export function validateFormats_v0<V>(v: V) {
  return validate<Formats_v0 & V>(v, id, hashFormats_v0);
}

export interface View {
  $type?: "blue.moji.embed.sticker#view";
  sticker: ViewSticker;
}

const hashView = "view";

export function isView<V>(v: V) {
  return is$typed(v, id, hashView);
}

export function validateView<V>(v: V) {
  return validate<View & V>(v, id, hashView);
}

export interface ViewSticker {
  $type?: "blue.moji.embed.sticker#viewSticker";
  /** Fully-qualified URL of the full-size sticker asset. */
  fullsize: string;
  /** URL of the 128px inline-emoji rendition, if available. */
  thumb?: string;
  name: string;
  alt?: string;
  aspectRatio?: AppBskyEmbedDefs.AspectRatio;
  record?: ComAtprotoRepoStrongRef.Main;
  labels?: ComAtprotoLabelDefs.Label[];
}

const hashViewSticker = "viewSticker";

export function isViewSticker<V>(v: V) {
  return is$typed(v, id, hashViewSticker);
}

export function validateViewSticker<V>(v: V) {
  return validate<ViewSticker & V>(v, id, hashViewSticker);
}
