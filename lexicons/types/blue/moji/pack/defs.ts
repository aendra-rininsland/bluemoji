/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'
import * as BlueMojiRichtextFacet from '../richtext/facet'
import * as BlueMojiCollection from '../collection'
import * as AppBskyActorDefs from '../../../app/bsky/actor/defs'
import * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs'

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
    (v.$type === 'blue.moji.pack.defs#main' ||
      v.$type === 'blue.moji.pack.defs')
  )
}

export function validateRecord(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.pack.defs#main', v)
}

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
  viewer?: ListViewerState
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
  descriptionFacets?: BlueMojiRichtextFacet.Main[]
  avatar?: string
  listItemCount?: number
  labels?: ComAtprotoLabelDefs.Label[]
  viewer?: ListViewerState
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
  subject: BlueMojiCollection.ItemView
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