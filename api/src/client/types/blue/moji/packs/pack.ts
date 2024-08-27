/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'
import { CID } from 'multiformats/cid'
import * as BlueMojiRichtextFacet from '../richtext/facet'
import * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs'

export interface Record {
  name: string
  description?: string
  descriptionFacets?: BlueMojiRichtextFacet.Main[]
  icon?: BlobRef
  adultOnly: boolean
  createdAt: string
  labels?:
    | ComAtprotoLabelDefs.SelfLabels
    | { $type: string; [k: string]: unknown }
  [k: string]: unknown
}

export function isRecord(v: unknown): v is Record {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    (v.$type === 'blue.moji.packs.pack#main' ||
      v.$type === 'blue.moji.packs.pack')
  )
}

export function validateRecord(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.packs.pack#main', v)
}
