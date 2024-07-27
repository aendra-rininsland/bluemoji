/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'

export interface ItemView {
  name: string
  alt?: string
  createdAt?: string
  asset: Uint8Array
  adultOnly: boolean
  [k: string]: unknown
}

export function isItemView(v: unknown): v is ItemView {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.collection.defs#itemView'
  )
}

export function validateItemView(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.defs#itemView', v)
}
