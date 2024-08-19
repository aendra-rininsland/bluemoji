/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'
import { CID } from 'multiformats/cid'
import * as AppBskyActorDefs from '../../../app/bsky/actor/defs'
import * as AppBskyRichtextFacet from '../../../app/bsky/richtext/facet'
import * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs'

export interface CollectionView {
  uri: string
  cid: string
  creator: AppBskyActorDefs.ProfileView
  name: string
  description?: string
  descriptionFacets?: AppBskyRichtextFacet.Main[]
  avatar?: string
  collectionItemCount?: number
  labels?: ComAtprotoLabelDefs.Label[]
  indexedAt: string
  [k: string]: unknown
}

export function isCollectionView(v: unknown): v is CollectionView {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.collection.defs#collectionView'
  )
}

export function validateCollectionView(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.defs#collectionView', v)
}
