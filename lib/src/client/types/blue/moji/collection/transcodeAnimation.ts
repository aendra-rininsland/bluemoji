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
const id = "blue.moji.collection.transcodeAnimation";

export type QueryParams = {};

export interface InputSchema {
  /** Base64-encoded source file bytes (e.g. an APNG). */
  data: string;
}

export interface OutputSchema {
  /** Base64-encoded 128x128 animated WebP, for the inline formats_v1#webp_128 slot. */
  webp128?: string;
  /** Base64-encoded 512x512 animated WebP, for the stickerFormats_v0#webp_512 slot. */
  webp512?: string;
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
