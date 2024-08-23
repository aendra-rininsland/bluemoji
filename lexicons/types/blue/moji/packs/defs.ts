/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'
import { CID } from 'multiformats/cid'
import * as BlueMojiRichtextFacet from '../richtext/facet'
import * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs'
import * as AppBskyActorDefs from '../../../app/bsky/actor/defs'
import * as AppBskyRichtextFacet from '../../../app/bsky/richtext/facet'
import * as BlueMojiCollectionItem from '../collection/item'

export interface PackViewBasic {
  uri: string
  cid: string
  name: string
  description?: string
  descriptionFacets?: BlueMojiRichtextFacet.Main[]
  avatar?: string
  itemCount?: number
  labels?: ComAtprotoLabelDefs.Label[]
  viewer?: PackViewerState
  indexedAt?: string
  [k: string]: unknown
}

export function isPackViewBasic(v: unknown): v is PackViewBasic {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.packs.defs#packViewBasic'
  )
}

export function validatePackViewBasic(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.packs.defs#packViewBasic', v)
}

export interface PackView {
  uri: string
  cid: string
  creator: AppBskyActorDefs.ProfileView
  name: string
  description?: string
  descriptionFacets?: AppBskyRichtextFacet.Main[]
  avatar?: string
  packItemCount?: number
  labels?: ComAtprotoLabelDefs.Label[]
  viewer?: PackViewerState
  indexedAt: string
  [k: string]: unknown
}

export function isPackView(v: unknown): v is PackView {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.packs.defs#packView'
  )
}

export function validatePackView(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.packs.defs#packView', v)
}

export interface PackItemView {
  uri: string
  subject: BlueMojiCollectionItem.ItemView
  [k: string]: unknown
}

export function isPackItemView(v: unknown): v is PackItemView {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.packs.defs#packItemView'
  )
}

export function validatePackItemView(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.packs.defs#packItemView', v)
}

export interface PackViewerState {
  savedToCollection?: boolean
  [k: string]: unknown
}

export function isPackViewerState(v: unknown): v is PackViewerState {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.packs.defs#packViewerState'
  )
}

export function validatePackViewerState(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.packs.defs#packViewerState', v)
}
