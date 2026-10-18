/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atproto/xrpc";
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as ComAtprotoLabelDefs from "../../../com/atproto/label/defs.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.moderation.applyLabel";

export type QueryParams = {};

export interface InputSchema {
  /** AT-URI of an indexed blue.moji.collection.item record (when lifting a label, the record need not be indexed any more). */
  uri: string;
  /** The label value. 'bluemoji-takedown' removes the emoji from this AppView; 'bluemoji-adult' marks it adult-only. */
  val:
    | "bluemoji-takedown"
    | "bluemoji-adult"
    | "bluemoji-abusive"
    | "bluemoji-impersonation"
    | (string & {});
  /** Lift the label instead of applying it. */
  neg?: boolean;
  /** When the label expires, in the future. Omit for no expiry. */
  exp?: string;
  /** A private note for the audit trail. Never published in the label. */
  reason?: string;
}

export interface OutputSchema {
  label: ComAtprotoLabelDefs.Label;
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
