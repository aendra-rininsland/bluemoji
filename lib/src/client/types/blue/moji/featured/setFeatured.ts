/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atproto/xrpc";
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.featured.setFeatured";

export type QueryParams = {};

export interface InputSchema {
  /** AT-URI of a blue.moji.collection.item or blue.moji.packs.pack record. Features of items require the item to be indexed. */
  uri: string;
  featured: boolean;
}

export interface OutputSchema {
  uri: string;
  featured: boolean;
}

export interface CallOptions {
  signal?: AbortSignal;
  headers?: HeadersMap;
  qp?: QueryParams;
  encoding?: "application/json";
}

export interface Response {
  success: boolean;
  headers: HeadersMap;
  data: OutputSchema;
}

export function toKnownErr(e: any) {
  return e;
}
