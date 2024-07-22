/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'

export interface Record {
  name?: string
  alt?: string
  createdAt?: string
  images?: Images
  [k: string]: unknown
}

export function isRecord(v: unknown): v is Record {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    (v.$type === 'dev.aendra.bsky.bluemoji#main' ||
      v.$type === 'dev.aendra.bsky.bluemoji')
  )
}

export function validateRecord(v: unknown): ValidationResult {
  return lexicons.validate('dev.aendra.bsky.bluemoji#main', v)
}

export interface Images {
  original: BlobRef
  sizes: Sizes
  [k: string]: unknown
}

export function isImages(v: unknown): v is Images {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'dev.aendra.bsky.bluemoji#images'
  )
}

export function validateImages(v: unknown): ValidationResult {
  return lexicons.validate('dev.aendra.bsky.bluemoji#images', v)
}

export interface Sizes {
  16: string
  32: string
  64: string
  128: string
  256: string
  [k: string]: unknown
}

export function isSizes(v: unknown): v is Sizes {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'dev.aendra.bsky.bluemoji#sizes'
  )
}

export function validateSizes(v: unknown): ValidationResult {
  return lexicons.validate('dev.aendra.bsky.bluemoji#sizes', v)
}
