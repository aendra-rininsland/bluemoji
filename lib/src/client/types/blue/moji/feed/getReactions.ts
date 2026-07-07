/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atproto/xrpc";
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as BlueMojiFeedDefs from "./defs.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.feed.getReactions";

export type QueryParams = {
  /** AT-URI of the subject post. */
  uri: string;
  limit?: number;
  cursor?: string;
};
export type InputSchema = undefined;

export interface OutputSchema {
  uri: string;
  cursor?: string;
  groups: BlueMojiFeedDefs.ReactionGroup[];
  reactions: BlueMojiFeedDefs.ReactionView[];
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
