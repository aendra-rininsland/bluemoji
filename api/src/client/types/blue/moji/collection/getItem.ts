/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc'
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'
import { CID } from 'multiformats/cid'
import * as BlueMojiCollectionItem from './item'

export interface QueryParams {
  /** The handle or DID of the repo. */
  repo: string
  /** The Bluemoji alias/rkey. */
  name: string
}

export type InputSchema = undefined

export interface OutputSchema {
  uri: string
  item: BlueMojiCollectionItem.ItemView
  [k: string]: unknown
}

export interface CallOptions {
  signal?: AbortSignal
  headers?: HeadersMap
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export function toKnownErr(e: any) {
  return e
}
