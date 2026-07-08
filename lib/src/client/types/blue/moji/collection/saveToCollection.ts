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
const id = "blue.moji.collection.saveToCollection";

export type QueryParams = {};

export interface InputSchema {
  /** The handle or DID of the repo to copy from. */
  source: string;
  /** The source Bluemoji alias or rkey. Internationalised aliases are accepted and encoded per RFC 0005. */
  name: string;
  /** The alias to save the Bluemoji to in the current logged-in user's repo. */
  renameTo?: string;
}

export interface OutputSchema {
  uri: string;
  item: BlueMojiCollectionItem.ItemView;
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

export class EmojiNotFoundError extends XRPCError {
  constructor(src: XRPCError) {
    super(src.status, src.error, src.message, src.headers, { cause: src });
  }
}

export class DestinationExistsError extends XRPCError {
  constructor(src: XRPCError) {
    super(src.status, src.error, src.message, src.headers, { cause: src });
  }
}

export function toKnownErr(e: any) {
  if (e instanceof XRPCError) {
    if (e.error === "EmojiNotFound") return new EmojiNotFoundError(e);
    if (e.error === "DestinationExists") return new DestinationExistsError(e);
  }

  return e;
}
