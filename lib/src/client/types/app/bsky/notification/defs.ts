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

const is$typed = _is$typed,
  validate = _validate
const id = 'app.bsky.notification.defs'

export interface Preference {
  $type?: 'app.bsky.notification.defs#preference'
  list: boolean
  push: boolean
}

const hashPreference = 'preference'

export function isPreference<V>(v: V) {
  return is$typed(v, id, hashPreference)
}

export function validatePreference<V>(v: V) {
  return validate<Preference & V>(v, id, hashPreference)
}

export interface Preferences {
  $type?: 'app.bsky.notification.defs#preferences'
  chat: ChatPreference
  like: FilterablePreference
  quote: FilterablePreference
  reply: FilterablePreference
  follow: FilterablePreference
  repost: FilterablePreference
  mention: FilterablePreference
  verified: Preference
  unverified: Preference
  likeViaRepost: FilterablePreference
  subscribedPost: Preference
  repostViaRepost: FilterablePreference
  starterpackJoined: Preference
}

const hashPreferences = 'preferences'

export function isPreferences<V>(v: V) {
  return is$typed(v, id, hashPreferences)
}

export function validatePreferences<V>(v: V) {
  return validate<Preferences & V>(v, id, hashPreferences)
}

export interface RecordDeleted {
  $type?: 'app.bsky.notification.defs#recordDeleted'
}

const hashRecordDeleted = 'recordDeleted'

export function isRecordDeleted<V>(v: V) {
  return is$typed(v, id, hashRecordDeleted)
}

export function validateRecordDeleted<V>(v: V) {
  return validate<RecordDeleted & V>(v, id, hashRecordDeleted)
}

export interface ChatPreference {
  $type?: 'app.bsky.notification.defs#chatPreference'
  push: boolean
  include: 'all' | 'accepted' | (string & {})
}

const hashChatPreference = 'chatPreference'

export function isChatPreference<V>(v: V) {
  return is$typed(v, id, hashChatPreference)
}

export function validateChatPreference<V>(v: V) {
  return validate<ChatPreference & V>(v, id, hashChatPreference)
}

export interface ActivitySubscription {
  $type?: 'app.bsky.notification.defs#activitySubscription'
  post: boolean
  reply: boolean
}

const hashActivitySubscription = 'activitySubscription'

export function isActivitySubscription<V>(v: V) {
  return is$typed(v, id, hashActivitySubscription)
}

export function validateActivitySubscription<V>(v: V) {
  return validate<ActivitySubscription & V>(v, id, hashActivitySubscription)
}

export interface FilterablePreference {
  $type?: 'app.bsky.notification.defs#filterablePreference'
  list: boolean
  push: boolean
  include: 'all' | 'follows' | (string & {})
}

const hashFilterablePreference = 'filterablePreference'

export function isFilterablePreference<V>(v: V) {
  return is$typed(v, id, hashFilterablePreference)
}

export function validateFilterablePreference<V>(v: V) {
  return validate<FilterablePreference & V>(v, id, hashFilterablePreference)
}

/** Object used to store activity subscription data in stash. */
export interface SubjectActivitySubscription {
  $type?: 'app.bsky.notification.defs#subjectActivitySubscription'
  subject: string
  activitySubscription: ActivitySubscription
}

const hashSubjectActivitySubscription = 'subjectActivitySubscription'

export function isSubjectActivitySubscription<V>(v: V) {
  return is$typed(v, id, hashSubjectActivitySubscription)
}

export function validateSubjectActivitySubscription<V>(v: V) {
  return validate<SubjectActivitySubscription & V>(
    v,
    id,
    hashSubjectActivitySubscription,
  )
}
