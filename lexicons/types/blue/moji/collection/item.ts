/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'

export interface Record {
  $type: 'blue.moji.collection.item'
  name: string
  alt: string
  createdAt: string
  asset: BytesAsset | BlobAsset | { $type: string; [k: string]: unknown }
  original?: BlobRef
  adultOnly: boolean
  [k: string]: unknown
}

export function isRecord(v: unknown): v is Record {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    (v.$type === 'blue.moji.collection.item#main' ||
      v.$type === 'blue.moji.collection.item')
  )
}

export function validateRecord(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.item#main', v)
}

export interface BlobAsset {
  $type: 'blue.moji.collection.item#blobAsset'
  file: BlobRef
  [k: string]: unknown
}

export function isBlobAsset(v: unknown): v is BlobAsset {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.collection.item#blobAsset'
  )
}

export function validateBlobAsset(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.item#blobAsset', v)
}

export interface BytesAsset {
  $type: 'blue.moji.collection.item#bytesAsset'
  file: BytesFile
  [k: string]: unknown
}

export function isBytesAsset(v: unknown): v is BytesAsset {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.collection.item#bytesAsset'
  )
}

export function validateBytesAsset(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.item#bytesAsset', v)
}

export interface BytesFile {
  bytes: Uint8Array
  mimeType: 'image/png' | 'image/apng' | 'image/gif'
  [k: string]: unknown
}

export function isBytesFile(v: unknown): v is BytesFile {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'blue.moji.collection.item#bytesFile'
  )
}

export function validateBytesFile(v: unknown): ValidationResult {
  return lexicons.validate('blue.moji.collection.item#bytesFile', v)
}
