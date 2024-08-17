/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'
import * as BlueMojiCollectionDefs from '../collection/defs'

export interface Record {
  subject: BlueMojiCollectionDefs.ItemView
  /** Reference (AT-URI) to the pack record (blue.moji.pack) */
  list: string
  createdAt: string
  [k: string]: unknown
}

export function isRecord(v: unknown): v is Record {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    (v.$type === 'blue.moji.pack.listitem#main' ||
      v.$type === 'blue.moji.pack.listitem')
  )
}

export function validateRecord(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.pack.listitem#main', v)
}
