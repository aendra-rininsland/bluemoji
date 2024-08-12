/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'

export interface Record {
  name: string
  alt: string
  createdAt: string
  formats?: Formats_v0 | { $type: string; [k: string]: unknown }
  original: BlobRef
  adultOnly: boolean
  copyOf?: string
  [k: string]: unknown
}

export function isRecord(v: unknown): v is Record {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    (v.$type === 'blue.moji.collection.item#main' ||
      v.$type === 'blue.moji.collection.item')
  )
}

export function validateRecord(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.item#main', v)
}

export interface Formats_v0 {
  png_128: BytesOrBlobType_v0
  [k: string]: unknown
}

export function isFormats_v0(v: unknown): v is Formats_v0 {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.collection.item#formats_v0'
  )
}

export function validateFormats_v0(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.item#formats_v0', v)
}

export interface BytesOrBlobType_v0 {
  blob?: BlobRef
  raw?: Uint8Array
  [k: string]: unknown
}

export function isBytesOrBlobType_v0(v: unknown): v is BytesOrBlobType_v0 {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.collection.item#bytesOrBlobType_v0'
  )
}

export function validateBytesOrBlobType_v0(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.item#bytesOrBlobType_v0', v)
}
