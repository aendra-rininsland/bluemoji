/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atproto/xrpc";
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as BlueMojiCollectionItem from "../collection/item.js";
import type * as BlueMojiPacksDefs from "../packs/defs.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.featured.getFeatured";

export type QueryParams = {};
export type InputSchema = undefined;

export interface OutputSchema {
  emoji: BlueMojiCollectionItem.ItemView[];
  stickers: BlueMojiCollectionItem.ItemView[];
  packs: BlueMojiPacksDefs.PackViewBasic[];
  /** Only populated for administrators: every featured subject URI, including ones that currently fail to resolve, so they can be un-featured. */
  featuredUris?: string[];
  /** Whether the authenticated viewer may call setFeatured. */
  viewerIsAdmin: boolean;
}

export interface CallOptions {
  signal?: AbortSignal;
  headers?: HeadersMap;
}

export interface Response {
  success: boolean;
  headers: HeadersMap;
  data: OutputSchema;
}

export function toKnownErr(e: any) {
  return e;
}
