/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'
import { CID } from 'multiformats/cid'

export interface Record {
  /** Reference (AT-URI) to the Bluemoji item record (blue.moji.collection.item). */
  subject: string
  /** Reference (AT-URI) to the pack record (blue.moji.packs.pack). */
  pack: string
  createdAt: string
  [k: string]: unknown
}

export function isRecord(v: unknown): v is Record {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    (v.$type === 'blue.moji.packs.packitem#main' ||
      v.$type === 'blue.moji.packs.packitem')
  )
}

export function validateRecord(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.packs.packitem#main', v)
}
