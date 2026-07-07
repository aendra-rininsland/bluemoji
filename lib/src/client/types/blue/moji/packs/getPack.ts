/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atproto/xrpc";
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as BlueMojiPacksDefs from "./defs.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.packs.getPack";

export type QueryParams = {
  /** Reference (AT-URI) of the pack record to hydrate. */
  pack: string;
  limit?: number;
  cursor?: string;
};
export type InputSchema = undefined;

export interface OutputSchema {
  cursor?: string;
  pack: BlueMojiPacksDefs.PackView;
  items: BlueMojiPacksDefs.PackItemView[];
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
