/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as BlueMojiRichtextFacet from "../richtext/facet.js";
import type * as ComAtprotoLabelDefs from "../../../com/atproto/label/defs.js";
import type * as AppBskyActorDefs from "../../../app/bsky/actor/defs.js";
import type * as AppBskyRichtextFacet from "../../../app/bsky/richtext/facet.js";
import type * as BlueMojiCollectionItem from "../collection/item.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.packs.defs";

export interface PackViewBasic {
  $type?: "blue.moji.packs.defs#packViewBasic";
  uri: string;
  cid: string;
  name: string;
  description?: string;
  descriptionFacets?: BlueMojiRichtextFacet.Main[];
  avatar?: string;
  itemCount?: number;
  labels?: ComAtprotoLabelDefs.Label[];
  viewer?: PackViewerState;
  indexedAt?: string;
}

const hashPackViewBasic = "packViewBasic";

export function isPackViewBasic<V>(v: V) {
  return is$typed(v, id, hashPackViewBasic);
}

export function validatePackViewBasic<V>(v: V) {
  return validate<PackViewBasic & V>(v, id, hashPackViewBasic);
}

export interface PackView {
  $type?: "blue.moji.packs.defs#packView";
  uri: string;
  cid: string;
  creator: AppBskyActorDefs.ProfileView;
  name: string;
  description?: string;
  descriptionFacets?: AppBskyRichtextFacet.Main[];
  avatar?: string;
  packItemCount?: number;
  labels?: ComAtprotoLabelDefs.Label[];
  viewer?: PackViewerState;
  indexedAt: string;
}

const hashPackView = "packView";

export function isPackView<V>(v: V) {
  return is$typed(v, id, hashPackView);
}

export function validatePackView<V>(v: V) {
  return validate<PackView & V>(v, id, hashPackView);
}

export interface PackItemView {
  $type?: "blue.moji.packs.defs#packItemView";
  uri: string;
  subject: BlueMojiCollectionItem.ItemView;
}

const hashPackItemView = "packItemView";

export function isPackItemView<V>(v: V) {
  return is$typed(v, id, hashPackItemView);
}

export function validatePackItemView<V>(v: V) {
  return validate<PackItemView & V>(v, id, hashPackItemView);
}

export interface PackViewerState {
  $type?: "blue.moji.packs.defs#packViewerState";
  savedToCollection?: boolean;
}

const hashPackViewerState = "packViewerState";

export function isPackViewerState<V>(v: V) {
  return is$typed(v, id, hashPackViewerState);
}

export function validatePackViewerState<V>(v: V) {
  return validate<PackViewerState & V>(v, id, hashPackViewerState);
}
