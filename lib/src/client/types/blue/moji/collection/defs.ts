/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'
import type * as AppBskyActorDefs from '../../../app/bsky/actor/defs.js'
import type * as AppBskyRichtextFacet from '../../../app/bsky/richtext/facet.js'
import type * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'blue.moji.collection.defs'

export interface CollectionView {
  $type?: 'blue.moji.collection.defs#collectionView'
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
}

const hashCollectionView = 'collectionView'

export function isCollectionView<V>(v: V) {
  return is$typed(v, id, hashCollectionView)
}

export function validateCollectionView<V>(v: V) {
  return validate<CollectionView & V>(v, id, hashCollectionView)
}
