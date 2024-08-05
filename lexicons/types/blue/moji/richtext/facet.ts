/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'
import * as AppBskyRichtextFacet from '../../../app/bsky/richtext/facet'

/** Annotation of a sub-string within rich text */
export interface Main {
  index: AppBskyRichtextFacet.ByteSlice
  features: (
    | AppBskyRichtextFacet.Mention
    | AppBskyRichtextFacet.Link
    | AppBskyRichtextFacet.Tag
    | Bluemoji
    | { $type: string; [k: string]: unknown }
  )[]
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

export interface Bluemoji {
  name: string
  uri: string
  alt?: string
  [k: string]: unknown
}

export function isBluemoji(v: unknown): v is Bluemoji {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.richtext.facet#bluemoji'
  )
}

export function validateBluemoji(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.richtext.facet#bluemoji', v)
}
