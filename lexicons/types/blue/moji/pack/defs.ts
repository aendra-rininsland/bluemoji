/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'
import * as AppBskyActorDefs from '../../../app/bsky/actor/defs'
import * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs'
import * as AppBskyRichtextFacet from '../../../app/bsky/richtext/facet'
import * as BlueMojiCollectionDefs from '../collection/defs'

export interface BluemojiPackView {
  uri: string
  cid: string
  record: {}
  creator: AppBskyActorDefs.ProfileViewBasic
  items?: ListViewBasic
  listItemsSample?: ListItemView[]
  labels?: ComAtprotoLabelDefs.Label[]
  indexedAt: string
  [k: string]: unknown
}

export function isBluemojiPackView(v: unknown): v is BluemojiPackView {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.pack.defs#bluemojiPackView'
  )
}

export function validateBluemojiPackView(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.pack.defs#bluemojiPackView', v)
}

export interface ListViewBasic {
  uri: string
  cid: string
  name: string
  avatar?: string
  listItemCount?: number
  labels?: ComAtprotoLabelDefs.Label[]
  indexedAt?: string
  [k: string]: unknown
}

export function isListViewBasic(v: unknown): v is ListViewBasic {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.pack.defs#listViewBasic'
  )
}

export function validateListViewBasic(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.pack.defs#listViewBasic', v)
}

export interface ListView {
  uri: string
  cid: string
  creator: AppBskyActorDefs.ProfileViewBasic
  name: string
  description?: string
  descriptionFacets?: AppBskyRichtextFacet.Main[]
  avatar?: string
  listItemCount?: number
  labels?: ComAtprotoLabelDefs.Label[]
  indexedAt: string
  [k: string]: unknown
}

export function isListView(v: unknown): v is ListView {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.pack.defs#listView'
  )
}

export function validateListView(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.pack.defs#listView', v)
}

export interface ListItemView {
  uri: string
  subject: BlueMojiCollectionDefs.ItemView
  [k: string]: unknown
}

export function isListItemView(v: unknown): v is ListItemView {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.pack.defs#listItemView'
  )
}

export function validateListItemView(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.pack.defs#listItemView', v)
}
