/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atproto/xrpc";
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as BlueMojiCollectionItem from "./item.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.collection.searchItems";

export type QueryParams = {
  /** Search query, matched against the alias and alt text. */
  q: string;
  /** Restrict results to a single repo's collection, using substring matching. Network-wide whole-word search when omitted. */
  repo?: string;
  limit?: number;
  cursor?: string;
};
export type InputSchema = undefined;

export interface OutputSchema {
  cursor?: string;
  items: BlueMojiCollectionItem.ItemView[];
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
