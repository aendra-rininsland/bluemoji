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
const id = "blue.moji.richtext.facet";

export interface Main {
  $type?: "blue.moji.richtext.facet";
  /** DID of the user posting the Bluemoji */
  did: string;
  /** Name of the Bluemoji in :emoji: format */
  name: string;
  alt?: string;
  adultOnly: boolean;
  labels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string };
  formats: $Typed<Formats_v0> | $Typed<Formats_v1> | { $type: string };
}

const hashMain = "main";

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain);
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain);
}

/** On the facet, only the CID is provided as this can be combined with the DID to create CDN URLs for non-animated blobs. For APNG and dotLottie, raw Bytes are served and require a com.atproto.repo.getRecord roundtrip on render so are marked with a boolean */
export interface Formats_v1 {
  $type?: "blue.moji.richtext.facet#formats_v1";
  png_128?: string;
  webp_128?: string;
  gif_128?: string;
  apng_128?: string;
  lottie?: string;
}

const hashFormats_v1 = "formats_v1";

export function isFormats_v1<V>(v: V) {
  return is$typed(v, id, hashFormats_v1);
}

export function validateFormats_v1<V>(v: V) {
  return validate<Formats_v1 & V>(v, id, hashFormats_v1);
}

/** On the facet, only the CID is provided as this can be combined with the DID to create CDN URLs for non-animated blobs. For APNG and dotLottie, raw Bytes are served and require a com.atproto.repo.getRecord roundtrip on render so are marked with a boolean */
export interface Formats_v0 {
  $type?: "blue.moji.richtext.facet#formats_v0";
  png_128?: string;
  webp_128?: string;
  gif_128?: string;
  apng_128: boolean;
  lottie: boolean;
}

const hashFormats_v0 = "formats_v0";

export function isFormats_v0<V>(v: V) {
  return is$typed(v, id, hashFormats_v0);
}

export function validateFormats_v0<V>(v: V) {
  return validate<Formats_v0 & V>(v, id, hashFormats_v0);
}
