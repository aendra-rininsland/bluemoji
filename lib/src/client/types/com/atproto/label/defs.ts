/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";

const is$typed = _is$typed,
  validate = _validate;
const id = "com.atproto.label.defs";

/** Metadata tag on an atproto resource (eg, repo or record). */
export interface Label {
  $type?: "com.atproto.label.defs#label";
  ver?: number;
  src: string;
  uri: string;
  cid?: string;
  val: string;
  neg?: boolean;
  cts: string;
  exp?: string;
  sig?: Uint8Array;
}

const hashLabel = "label";

export function isLabel<V>(v: V) {
  return is$typed(v, id, hashLabel);
}

export function validateLabel<V>(v: V) {
  return validate<Label & V>(v, id, hashLabel);
}

/** Metadata tags on an atproto record, published by the author within the record. */
export interface SelfLabels {
  $type?: "com.atproto.label.defs#selfLabels";
  values: SelfLabel[];
}

const hashSelfLabels = "selfLabels";

export function isSelfLabels<V>(v: V) {
  return is$typed(v, id, hashSelfLabels);
}

export function validateSelfLabels<V>(v: V) {
  return validate<SelfLabels & V>(v, id, hashSelfLabels);
}

export interface SelfLabel {
  $type?: "com.atproto.label.defs#selfLabel";
  val: string;
}

const hashSelfLabel = "selfLabel";

export function isSelfLabel<V>(v: V) {
  return is$typed(v, id, hashSelfLabel);
}

export function validateSelfLabel<V>(v: V) {
  return validate<SelfLabel & V>(v, id, hashSelfLabel);
}

/** Declares a label value and its expected interpretations and behaviors. */
export interface LabelValueDefinition {
  $type?: "com.atproto.label.defs#labelValueDefinition";
  identifier: string;
  severity: "inform" | "alert" | "none" | (string & {});
  blurs: "content" | "media" | "none" | (string & {});
  defaultSetting?: "ignore" | "warn" | "hide" | (string & {});
  adultOnly?: boolean;
  locales: LabelValueDefinitionStrings[];
}

const hashLabelValueDefinition = "labelValueDefinition";

export function isLabelValueDefinition<V>(v: V) {
  return is$typed(v, id, hashLabelValueDefinition);
}

export function validateLabelValueDefinition<V>(v: V) {
  return validate<LabelValueDefinition & V>(v, id, hashLabelValueDefinition);
}

export interface LabelValueDefinitionStrings {
  $type?: "com.atproto.label.defs#labelValueDefinitionStrings";
  lang: string;
  name: string;
  description: string;
}

const hashLabelValueDefinitionStrings = "labelValueDefinitionStrings";

export function isLabelValueDefinitionStrings<V>(v: V) {
  return is$typed(v, id, hashLabelValueDefinitionStrings);
}

export function validateLabelValueDefinitionStrings<V>(v: V) {
  return validate<LabelValueDefinitionStrings & V>(v, id, hashLabelValueDefinitionStrings);
}

export type LabelValue =
  | "!hide"
  | "!no-promote"
  | "!warn"
  | "!no-unauthenticated"
  | "dmca-violation"
  | "doxxing"
  | "porn"
  | "sexual"
  | "nudity"
  | "nsfl"
  | "gore"
  | (string & {});
