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
const id = "blue.moji.feed.getTrending";

export type QueryParams = {
  /** Trending window: 'day', 'week', or 'month'. Any other value is rejected. */
  period?: string;
  limit?: number;
};
export type InputSchema = undefined;

export interface OutputSchema {
  period: string;
  /** blue.moji.feed.defs#reactionGroup entries reused here: 'count' is the distinct-reactor count within the window (not a per-post count), and 'viewer' is always omitted since there's no single subject. */
  items: BlueMojiFeedDefs.ReactionGroup[];
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
