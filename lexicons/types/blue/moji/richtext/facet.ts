/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'

export interface Main {
  name: string
  alt?: string
  blobs?: Blobs_v0 | { $type: string; [k: string]: unknown }
  [k: string]: unknown
}

export function isMain(v: unknown): v is Main {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    (v.$type === 'blue.moji.richtext.facet#main' ||
      v.$type === 'blue.moji.richtext.facet')
  )
}

export function validateMain(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.richtext.facet#main', v)
}

export interface Blobs_v0 {
  png_128: string
  [k: string]: unknown
}

export function isBlobs_v0(v: unknown): v is Blobs_v0 {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.richtext.facet#blobs_v0'
  )
}

export function validateBlobs_v0(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.richtext.facet#blobs_v0', v)
}
