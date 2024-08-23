/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc'
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'
import { CID } from 'multiformats/cid'
import * as BlueMojiCollectionItem from './item'

export interface QueryParams {}

export interface InputSchema {
  /** The handle or DID of the repo to copy from. */
  source: string
  /** The source Bluemoji name/rkey. */
  name: string
  /** The alias to save the Bluemoji to in the current logged-in user's repo. */
  renameTo?: string
  [k: string]: unknown
}

export interface OutputSchema {
  uri: string
  item: BlueMojiCollectionItem.ItemView
  [k: string]: unknown
}

export interface CallOptions {
  signal?: AbortSignal
  headers?: HeadersMap
  qp?: QueryParams
  encoding?: 'application/json'
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export class EmojiNotFoundError extends XRPCError {
  constructor(src: XRPCError) {
    super(src.status, src.error, src.message, src.headers, { cause: src })
  }
}

export class DestinationExistsError extends XRPCError {
  constructor(src: XRPCError) {
    super(src.status, src.error, src.message, src.headers, { cause: src })
  }
}

export function toKnownErr(e: any) {
  if (e instanceof XRPCError) {
    if (e.error === 'EmojiNotFound') return new EmojiNotFoundError(e)
    if (e.error === 'DestinationExists') return new DestinationExistsError(e)
  }

  return e
}
