/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'

export interface Main {
  did: string
  name: string
  alt?: string
  formats: Formats_v0 | { $type: string; [k: string]: unknown }
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

export interface Formats_v0 {
  png_128?: string
  webp_128?: string
  gif_128?: string
  apng_128: boolean
  lottie: boolean
  [k: string]: unknown
}

export function isFormats_v0(v: unknown): v is Formats_v0 {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.richtext.facet#formats_v0'
  )
}

export function validateFormats_v0(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.richtext.facet#formats_v0', v)
}
