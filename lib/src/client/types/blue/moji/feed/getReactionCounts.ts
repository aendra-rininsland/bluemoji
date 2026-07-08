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
const id = "blue.moji.feed.getReactionCounts";

export type QueryParams = {
  /** AT-URIs of the subject posts. Send as a single comma-joined value (e.g. 'uris=at://a,at://b'), not repeated 'uris=' keys — this AppView's implementation currently only sees the last occurrence of a repeated query key. AT-URIs never contain commas (record keys exclude them), so this is unambiguous. */
  uris: string[];
};
export type InputSchema = undefined;

export interface OutputSchema {
  counts: SubjectReactionCounts[];
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

export interface SubjectReactionCounts {
  $type?: "blue.moji.feed.getReactionCounts#subjectReactionCounts";
  /** AT-URI of the subject post. Subjects with zero reactions are omitted from the response rather than included with an empty groups array. */
  uri: string;
  groups: BlueMojiFeedDefs.ReactionGroup[];
}

const hashSubjectReactionCounts = "subjectReactionCounts";

export function isSubjectReactionCounts<V>(v: V) {
  return is$typed(v, id, hashSubjectReactionCounts);
}

export function validateSubjectReactionCounts<V>(v: V) {
  return validate<SubjectReactionCounts & V>(v, id, hashSubjectReactionCounts);
}
