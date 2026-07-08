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

/** SECURITY: did/name/formats/adultOnly/labels are all self-attested by the posting client at write time and are not re-validated by the PDS. Consumers that render an image from this facet without first verifying it against the referenced blue.moji.collection.item record (e.g. via an AppView's blue.moji.collection.getItem, hydrated from firehose-verified data) are trusting the poster to have told the truth about whose emoji it is, what it looks like, and whether it needs a content warning. In particular, adultOnly/labels here MUST NOT be trusted for moderation decisions — a poster could simply omit them to bypass a warning the source item's own record carries. Verified renderers should use the source item's adultOnly/labels instead. Renderers that skip verification SHOULD treat the facet as decorative/best-effort only, exactly as they would an unverified embed. */
export interface Main {
  $type?: "blue.moji.richtext.facet";
  /** DID of the user posting the Bluemoji. Self-attested; see security note on this object. */
  did: string;
  /** Name of the Bluemoji in :emoji: format */
  name: string;
  alt?: string;
  /** Self-attested by the poster; see security note on this object. Verified renderers SHOULD use the source item's adultOnly instead. */
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

/** Only the CID is provided; combine with the facet's did to construct a blob/CDN URL with no additional round-trip. All formats, including animated ones, are CIDs of Blob-typed values on the source record. */
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

/** DEPRECATED, corresponds to blue.moji.collection.item#formats_v0. png/webp/gif are CIDs combinable with the facet's did to build a blob/CDN URL; apng_128/lottie are raw Bytes on the source record (not Blob) so are only marked present here as a boolean and require a com.atproto.repo.getRecord round-trip to render. */
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
