/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as ComAtprotoLabelDefs from "../../../com/atproto/label/defs.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.collection.item";

export interface Main {
  $type: "blue.moji.collection.item";
  /** Should be in the format :emoji: */
  name: string;
  alt?: string;
  createdAt: string;
  formats: $Typed<Formats_v0> | $Typed<Formats_v1> | { $type: string };
  stickerFormats?: $Typed<StickerFormats_v0> | { $type: string };
  adultOnly: boolean;
  labels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string };
  copyOf?: string;
  fallbackText: string;
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

export interface Formats_v0 {
  $type?: "blue.moji.collection.item#formats_v0";
  original?: BlobRef;
  png_128?: Blob_v0;
  apng_128?: Bytes_v0;
  gif_128?: Blob_v0;
  webp_128?: Blob_v0;
  lottie?: Bytes_v0;
}

const hashFormats_v0 = "formats_v0";

export function isFormats_v0<V>(v: V) {
  return is$typed(v, id, hashFormats_v0);
}

export function validateFormats_v0<V>(v: V) {
  return validate<Formats_v0 & V>(v, id, hashFormats_v0);
}

export interface Formats_v1 {
  $type?: "blue.moji.collection.item#formats_v1";
  original?: BlobRef;
  png_128?: Blob_v1;
  apng_128?: Blob_v1;
  gif_128?: Blob_v1;
  webp_128?: Blob_v1;
  lottie?: Blob_v1;
}

const hashFormats_v1 = "formats_v1";

export function isFormats_v1<V>(v: V) {
  return is$typed(v, id, hashFormats_v1);
}

export function validateFormats_v1<V>(v: V) {
  return validate<Formats_v1 & V>(v, id, hashFormats_v1);
}

/** Full-size (up to 512×512) renditions for sharing as a sticker. Raster formats should be exactly 512px on the longest edge. */
export interface StickerFormats_v0 {
  $type?: "blue.moji.collection.item#stickerFormats_v0";
  png_512?: Blob_sticker;
  webp_512?: Blob_sticker;
  gif_512?: Blob_sticker;
  apng_512?: Blob_sticker;
  lottie?: Blob_sticker;
}

const hashStickerFormats_v0 = "stickerFormats_v0";

export function isStickerFormats_v0<V>(v: V) {
  return is$typed(v, id, hashStickerFormats_v0);
}

export function validateStickerFormats_v0<V>(v: V) {
  return validate<StickerFormats_v0 & V>(v, id, hashStickerFormats_v0);
}

/** Stickers render one-per-post at full size, so a larger budget than inline emoji is acceptable. */
export type Blob_sticker = BlobRef;
/** Limiting blobs to 128kb because there may be many on page and these get optimised by ImgProxy anyway */
export type Blob_v1 = BlobRef;
/** Limiting blobs to 256kb because there may be many on page and these get optimised by ImgProxy anyway */
export type Blob_v0 = BlobRef;
/** 64kb should be enough for anybody */
export type Bytes_v0 = Uint8Array;

export interface ItemView {
  $type?: "blue.moji.collection.item#itemView";
  /** AT-URI of the source item record. Views need this so consumers can derive the owning DID for blob URL construction. */
  uri?: string;
  /** DID of the repo that owns this item's blobs. */
  did?: string;
  name: string;
  alt?: string;
  createdAt?: string;
  formats: $Typed<Formats_v0> | $Typed<Formats_v1> | { $type: string };
  stickerFormats?: $Typed<StickerFormats_v0> | { $type: string };
  adultOnly: boolean;
}

const hashItemView = "itemView";

export function isItemView<V>(v: V) {
  return is$typed(v, id, hashItemView);
}

export function validateItemView<V>(v: V) {
  return validate<ItemView & V>(v, id, hashItemView);
}
