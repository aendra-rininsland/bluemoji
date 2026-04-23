/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc'
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'
import type * as BlueMojiCollectionItem from './item.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'blue.moji.collection.listCollection'

export type QueryParams = {
  /** The number of records to return. */
  limit?: number
  cursor?: string
  /** Flag to reverse the order of the returned records. */
  reverse?: boolean
}
export type InputSchema = undefined

export interface OutputSchema {
  cursor?: string
  items: BlueMojiCollectionItem.ItemView[]
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

export interface ItemView {
  $type?: 'blue.moji.collection.listCollection#itemView'
  uri: string
  record: BlueMojiCollectionItem.ItemView
}

const hashItemView = 'itemView'

export function isItemView<V>(v: V) {
  return is$typed(v, id, hashItemView)
}

export function validateItemView<V>(v: V) {
  return validate<ItemView & V>(v, id, hashItemView)
}
