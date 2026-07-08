// Auto-generated client-safe subset. Do not edit.
// Import this in app components instead of hatk.generated.ts
// to avoid pulling in server-only dependencies.
export type { XrpcSchema } from './hatk.generated.ts'
import type { XrpcSchema } from './hatk.generated.ts'
export type { Postgate, Threadgate, GetItem, Item, ListCollection, PutItem, SaveToCollection, SearchItems, GetReactionCounts, GetReactions, GetTrending, Reaction, GetActorPacks, GetPack, GetPacks, Pack, Packitem, CreateReport, DescribeCollections, DescribeFeeds, DescribeLabels, GetFeed, GetRecord, GetRecords, SearchRecords, UploadBlob, RecordRegistry, CreateRecord, DeleteRecord, PutRecord, Nux, MutedWord, SavedFeed, StatusView, ProfileView, BskyActorDefsViewerState, FeedViewPref, LabelersPref, InterestsPref, KnownFollowers, MutedWordsPref, SavedFeedsPref, ThreadViewPref, DeclaredAgePref, HiddenPostsPref, LabelerPrefItem, AdultContentPref, BskyAppStatePref, ContentLabelPref, ProfileViewBasic, SavedFeedsPrefV2, VerificationView, ProfileAssociated, VerificationPrefs, VerificationState, PersonalDetailsPref, ProfileViewDetailed, BskyAppProgressGuide, LiveEventPreferences, ProfileAssociatedChat, ProfileAssociatedGerm, PostInteractionSettingsPref, ProfileAssociatedActivitySubscription, AspectRatio, ExternalView, External, ViewExternal, ImagesView, Image, ViewImage, RecordView, ViewRecord, ViewBlocked, ViewDetached, ViewNotFound, RecordWithMediaView, VideoView, Caption, PostView, ReplyRef, ReasonPin, BlockedPost, Interaction, BskyFeedDefsViewerState, FeedViewPost, NotFoundPost, ReasonRepost, BlockedAuthor, GeneratorView, ThreadContext, ThreadViewPost, ThreadgateView, SkeletonFeedPost, SkeletonReasonPin, GeneratorViewerState, SkeletonReasonRepost, DisableRule, ListRule, MentionRule, FollowerRule, FollowingRule, ListView, ListItemView, Relationship, ListViewBasic, NotFoundActor, ListViewerState, StarterPackView, StarterPackViewBasic, LabelerView, LabelerPolicies, LabelerViewerState, LabelerViewDetailed, Preference, Preferences, RecordDeleted, ChatPreference, ActivitySubscription, FilterablePreference, SubjectActivitySubscription, Tag, Link, Mention, ByteSlice, CollectionView, ItemFormats_v0, ItemFormats_v1, StickerFormats_v0, ItemView, OriginalCreator, Sticker, StickerFormats_v02, StickerView, ViewSticker, ReactionView, ReactionGroup, SubjectReactionCounts, EmojiRef, PackViewBasic, PackView, PackItemView, PackViewerState, MojiRichtextFacetFormats_v1, MojiRichtextFacetFormats_v0, Label, SelfLabels, SelfLabel, LabelValueDefinition, LabelValueDefinitionStrings, RepoRef, LabelDefinition, LabelLocale } from './hatk.generated.ts'

const _procedures = new Set(['blue.moji.collection.putItem', 'blue.moji.collection.saveToCollection', 'dev.hatk.createRecord', 'dev.hatk.createReport', 'dev.hatk.deleteRecord', 'dev.hatk.putRecord'])
const _blobInputs = new Set(['dev.hatk.uploadBlob'])

type CallArg<K extends keyof XrpcSchema> =
  XrpcSchema[K] extends { input: infer I } ? I :
  XrpcSchema[K] extends { params: infer P } ? P :
  Record<string, unknown>
type OutputOf<K extends keyof XrpcSchema> = XrpcSchema[K]['output']

export async function callXrpc<K extends keyof XrpcSchema & string>(
  nsid: K,
  arg?: CallArg<K>,
  customFetch?: typeof globalThis.fetch,
): Promise<OutputOf<K>> {
  if (typeof window === 'undefined' && !customFetch) {
    const bridge = (globalThis as any).__hatk_callXrpc
    if (!bridge) throw new Error('callXrpc: server bridge not available — is hatk initialized?')
    if (_procedures.has(nsid) || _blobInputs.has(nsid)) return bridge(nsid, {}, arg) as Promise<OutputOf<K>>
    return bridge(nsid, arg) as Promise<OutputOf<K>>
  }
  const _fetch = customFetch ?? globalThis.fetch
  // Use relative URL so SvelteKit's fetch can deduplicate server/client requests
  let path = `/xrpc/${nsid}`
  if (_blobInputs.has(nsid)) {
    const blob = arg as Blob | ArrayBuffer
    const ct = blob instanceof Blob ? blob.type : 'application/octet-stream'
    const res = await _fetch(path, { method: 'POST', headers: { 'Content-Type': ct }, body: blob })
    if (typeof window !== 'undefined' && res.status === 401) { const _b = await res.json().catch(() => ({})); const _h = _b.handle ?? getViewer()?.handle; window.location.href = _h ? `/oauth/login?handle=${encodeURIComponent(_h)}` : '/oauth/login'; return new Promise(() => {}) as any }
    if (!res.ok) throw new Error(`XRPC ${nsid} failed: ${res.status}`)
    return res.json() as Promise<OutputOf<K>>
  }
  if (_procedures.has(nsid)) {
    const res = await _fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arg) })
    if (typeof window !== 'undefined' && res.status === 401) { const _b = await res.json().catch(() => ({})); const _h = _b.handle ?? getViewer()?.handle; window.location.href = _h ? `/oauth/login?handle=${encodeURIComponent(_h)}` : '/oauth/login'; return new Promise(() => {}) as any }
    if (!res.ok) throw new Error(`XRPC ${nsid} failed: ${res.status}`)
    return res.json() as Promise<OutputOf<K>>
  }
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(arg || {})) {
    if (v != null) params.set(k, String(v))
  }
  const qs = params.toString()
  if (qs) path += `?${qs}`
  const res = await _fetch(path)
  if (typeof window !== 'undefined' && res.status === 401) { const _b = await res.json().catch(() => ({})); const _h = _b.handle ?? getViewer()?.handle; window.location.href = _h ? `/oauth/login?handle=${encodeURIComponent(_h)}` : '/oauth/login'; return new Promise(() => {}) as any }
  if (!res.ok) throw new Error(`XRPC ${nsid} failed: ${res.status}`)
  return res.json() as Promise<OutputOf<K>>
}

export function getViewer(): { did: string; handle: string } | null {
  return (globalThis as any).__hatk_viewer ?? null
}

// ─── Auth Helpers ────────────────────────────────────────────────────

export async function login(handle: string): Promise<void> {
  const res = await fetch(`/oauth/login?handle=${encodeURIComponent(handle)}`, { redirect: 'manual' })
  if (res.type === 'opaqueredirect') {
    window.location.href = `/oauth/login?handle=${encodeURIComponent(handle)}`
    return
  }
  if (res.ok) return
  const body = await res.json().catch(() => ({ error: 'Login failed' }))
  throw new Error(body.error || 'Login failed')
}

export async function logout(): Promise<void> {
  ;(globalThis as any).__hatk_viewer = null
  await fetch('/auth/logout', { method: 'POST' }).catch(() => {})
}

export function viewerDid(): string | null {
  if (typeof window === 'undefined') return null
  const viewer = (globalThis as any).__hatk_viewer
  return viewer?.did ?? null
}

// Expose viewer for getViewer() bridge
;(globalThis as any).__hatk_auth = { viewerDid }

// ─── Server Helpers ──────────────────────────────────────────────────

export async function parseViewer(cookies: { get(name: string): string | undefined }): Promise<{ did: string; handle?: string } | null> {
  const parseSessionCookie = (globalThis as any).__hatk_parseSessionCookie
  if (!parseSessionCookie) return null
  const cookieValue = cookies.get('__hatk_session')
  if (!cookieValue) return null
  try {
    const request = new Request('http://localhost', { headers: { cookie: `__hatk_session=${cookieValue}` } })
    const viewer = await parseSessionCookie(request)
    if (viewer) (globalThis as any).__hatk_viewer = viewer
    return viewer
  } catch { return null }
}
