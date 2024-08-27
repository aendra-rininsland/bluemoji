/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'
import { CID } from 'multiformats/cid'
import * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs'

export interface Main {
  /** DID of the user posting the Bluemoji */
  did: string
  /** Name of the Bluemoji in :emoji: format */
  name: string
  alt?: string
  adultOnly: boolean
  labels?:
    | ComAtprotoLabelDefs.SelfLabels
    | { $type: string; [k: string]: unknown }
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

/** On the facet, only the CID is provided as this can be combined with the DID to create CDN URLs for non-animated blobs. For APNG and dotLottie, raw Bytes are served and require a com.atproto.repo.getRecord roundtrip on render so are marked with a boolean */
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
