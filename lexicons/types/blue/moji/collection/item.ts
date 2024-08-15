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
  png_128?: Blob_v0
  apng_128?: Bytes_v0
  gif_128?: Blob_v0
  webp_128?: Blob_v0
  lottie?: Bytes_v0
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

export type Blob_v0 = BlobRef
export type Bytes_v0 = Uint8Array
