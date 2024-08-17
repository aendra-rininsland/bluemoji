/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'
import * as BlueMojiCollectionItem from './item'
import * as AppBskyActorDefs from '../../../app/bsky/actor/defs'
import * as AppBskyRichtextFacet from '../../../app/bsky/richtext/facet'
import * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs'

export interface ItemView {
  name: string
  alt?: string
  createdAt?: string
  assets: BlueMojiCollectionItem.Sizes
  adultOnly: boolean
  [k: string]: unknown
}

export function isItemView(v: unknown): v is ItemView {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.collection.defs#itemView'
  )
}

export function validateItemView(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.defs#itemView', v)
}

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
