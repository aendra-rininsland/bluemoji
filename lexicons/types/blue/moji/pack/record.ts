/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'
import * as BlueMojiRichtextFacet from '../richtext/facet'
import * as BlueMojiCollection from '../collection'

export interface Record {
  name: string
  description?: string
  descriptionFacets?: BlueMojiRichtextFacet.Main[]
  icon?: BlobRef
  adultOnly: boolean
  createdAt: string
  items: BlueMojiCollection.ItemView[]
  [k: string]: unknown
}

export function isRecord(v: unknown): v is Record {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    (v.$type === 'blue.moji.pack.record#main' ||
      v.$type === 'blue.moji.pack.record')
  )
}

export function validateRecord(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.pack.record#main', v)
}
