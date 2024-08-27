/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'
import { CID } from 'multiformats/cid'
import * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs'

export interface Record {
  /** Should be in the format :emoji: */
  name: string
  alt?: string
  createdAt: string
  formats: Formats_v0 | { $type: string; [k: string]: unknown }
  adultOnly: boolean
  labels?:
    | ComAtprotoLabelDefs.SelfLabels
    | { $type: string; [k: string]: unknown }
  copyOf?: string
  fallbackText: string
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
  original?: BlobRef
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

/** Limiting blobs to 256kb because there may be many on page and these get optimised by ImgProxy anyway */
export type Blob_v0 = BlobRef
/** 64kb should be enough for anybody */
export type Bytes_v0 = Uint8Array

export interface ItemView {
  name: string
  alt?: string
  createdAt?: string
  formats: Formats_v0
  adultOnly: boolean
  [k: string]: unknown
}

export function isItemView(v: unknown): v is ItemView {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.collection.item#itemView'
  )
}

export function validateItemView(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.item#itemView', v)
}
