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
  /** The handle or DID of the repo (aka, current account). */
  repo: string
  /** Can be set to 'false' to skip Lexicon schema validation of record data. */
  validate?: boolean
  item: BlueMojiCollectionItem.ItemView
  [k: string]: unknown
}

export interface OutputSchema {
  uri: string
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

export function toKnownErr(e: any) {
  return e
}
