# Implementing Bluemoji: a guide for adopters

This is the deep-dive companion to [RENDERING.md](RENDERING.md). RENDERING.md
is the "render a Bluemoji facet in 20 lines" doc — read that first if you
just want inline emoji to show up somewhere. This document is for two more
involved cases:

- **Track A — [Forking `bluesky-social/social-app`](#track-a-forking-bluesky-socialsocial-app)**:
  wiring Bluemoji into the actual Bluesky client as a first-party feature —
  composer, rich text renderer, post embeds, reaction UI.
- **Track B — [Independent apps](#track-b-independent-non-microblogging-apps)**:
  adopting the `blue.moji.*` lexicons in an app that isn't a Bluesky fork at
  all — a chat app, a forum, a game, a bot — with no assumption that you're
  running hatk (the framework this repo's AppView is built on) or any
  particular AppView framework.

Read [§0](#0-core-concepts-read-this-first) first regardless of which track
you're on. Everything else builds on it.

---

## 0. Core concepts (read this first)

### 0.1 The trust model: self-attestation vs. verification

This is the single most important thing to get right, and the easiest thing
to get wrong by copy-pasting example code without reading the caveat.

Every `blue.moji.*` structure that appears **inside someone else's record**
— a `blue.moji.richtext.facet` on a post, a `blue.moji.embed.sticker` on a
post's embed, a `blue.moji.feed.reaction#emojiRef` on a reaction — is
**self-attested by whoever wrote that record**. Nothing on the network
validates that a facet's claimed `did`, `formats`, `alt`, `adultOnly`, or
`labels` actually match the real emoji at `did`. A malicious or buggy client
can:

- Claim someone else's `did` next to a CID that isn't even an image.
- Omit `adultOnly` to dodge a content warning the real emoji carries.
- Point at formats that were deleted, never existed, or belong to a
  completely different (possibly offensive) image.

The **only** trustworthy source of truth for what an emoji actually looks
like, who owns it, and whether it's flagged is the
`blue.moji.collection.item` record itself, at
`at://{did}/blue.moji.collection.item/{rkey}` — because that record only
exists in the index (or your app's read) after the network verified the
owning repo's commit signature. Everywhere this guide shows facet/embed/
reaction rendering, there's a "verify, don't trust" step; don't skip it for
anything that makes a moderation decision (whether to blur, whether to
render at all) or that a user could exploit (e.g. spoofing a verified
account's emoji).

The rkey for a given emoji name is **not** just the name with the colons
stripped — see §0.3.

### 0.2 Lexicon map

| NSID                                                              | What it is                                                                                                                                                              | Self-attested where it's embedded elsewhere?                             |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `blue.moji.collection.item`                                       | The emoji/sticker record itself: `formats` (128px, for inline), optional `stickerFormats` (512px, presence = sticker-capable), `adultOnly`, `labels`, optional `copyOf` | N/A — this **is** the trust anchor                                       |
| `blue.moji.richtext.facet`                                        | A feature on `app.bsky.richtext.facet`, alongside `#mention`/`#link`                                                                                                    | Yes — verify against `collection.item`                                   |
| `blue.moji.embed.sticker`                                         | A full-size sticker post embed, styled like `app.bsky.embed.external`                                                                                                   | Yes — verify against `collection.item`                                   |
| `blue.moji.feed.reaction`                                         | A reaction record: `subject` (the post at-uri) + `emojiRef` (self-attested pointer to the emoji used)                                                                   | Yes — verify `emojiRef` against `collection.item`                        |
| `blue.moji.packs.pack` / `packitem`                               | A named, curated, shareable collection of emoji-record references                                                                                                       | `packitem.subject` is an at-uri, not a claim — resolve it the normal way |
| `blue.moji.collection.getItem` / `listCollection` / `searchItems` | AppView read queries over indexed items                                                                                                                                 | —                                                                        |
| `blue.moji.packs.getPack` / `getActorPacks` / `getPacks`          | AppView read queries over indexed packs                                                                                                                                 | —                                                                        |
| `blue.moji.feed.getReactions` / `getReactionCounts`               | AppView read queries that return **pre-verified** reaction data                                                                                                         | —                                                                        |

If you're running your own AppView (Track B, §3.5), you produce the last
three rows yourself; if you're pointing at an existing one (moji.blue, or
whichever you're adopting alongside), you just call them.

### 0.3 Alias ↔ rkey (RFC 0005)

An emoji's `name` field always holds the colon-wrapped alias exactly as
typed (`:blobcat:`, `:見た目:`). The **record key** is derived from it, not
copied verbatim:

- If the alias matches `^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$` (lowercase
  ASCII, digits, `.`/`_`/`-` internally), the rkey **is** the alias.
- Otherwise (non-ASCII, uppercase, spaces, whatever), the rkey is
  `xn--` + RFC 3492 Punycode of the NFC-normalized, lowercased alias — the
  same scheme browsers use for internationalised domain names.

Never derive an rkey with `name.replace(/:/g, "")`. If you need this logic
and don't want to reimplement RFC 3492 Punycode yourself, the reference
implementation is [`app/lib/alias.ts`](app/lib/alias.ts) in this repo (also
exported from `@aendra/bluemoji` as `aliasToRkey`/`normalizeAlias`/
`rkeyToAlias`), with a small test suite (`lib/src/util/alias.test.ts`) that
exercises known tricky IDN vectors — copy it rather than rederive it,
Punycode has enough edge cases that a from-scratch reimplementation is a
likely source of interop bugs.

### 0.4 Blobs, CIDs, and why there's no `blob` field on a facet

ATProto has no mechanism to reference a blob in **someone else's** repo —
blobs are repo-local. So a facet, embed, or reaction can't literally embed
"the image"; it embeds `did` + a format's **CID string**, and the renderer
builds a fetch URL from those two pieces:

```
{pds}/xrpc/com.atproto.sync.getBlob?did={did}&cid={cid}
```

This is why `did` shows up on every self-attested structure in §0.2 even
though it seems redundant with the record's own repo — the facet/embed/
reaction lives in the **poster's** repo, but the emoji's blobs live in the
**emoji creator's** repo, which is usually a different account.

If you're running any kind of caching/CDN layer, put it in front of that
URL construction (see this repo's `/img/{did}/{cid}` proxy in
`app/routes/img/[did]/[cid]/+server.ts` for a same-origin, immutable-cached
example) rather than hot-linking PDS `getBlob` URLs from rendered content —
PDSes aren't CDNs and don't expect client-scale traffic.

---

## Track A: Forking `bluesky-social/social-app`

This track assumes "full native integration" — Bluemoji behaves like a
first-party Bluesky feature: it renders in the timeline, it's composable
from the post composer, and reactions get their own UI in the post action
bar. That's a real, ongoing fork-maintenance commitment (every touchpoint
below is a diff against upstream you'll need to keep re-applying or
rebasing), so read [§2.7](#27-fork-maintenance-considerations) before you
start.

Everything below was checked against the real `main` branch of
[`bluesky-social/social-app`](https://github.com/bluesky-social/social-app)
at the time this guide was written. File paths and exact APIs in an
actively-developed repo will drift — treat the code shown as "the shape of
the change and where it goes," verify against whatever commit you're
actually forking before you copy anything verbatim.

### 2.1 Orientation

The four places you'll touch, in the order this guide covers them:

1. `src/components/RichText.tsx` — renders inline facets (mentions, links,
   tags today). This is where inline Bluemoji rendering goes.
2. `src/types/bsky/post.ts` + `src/components/Post/Embed/` — the embed
   type union and dispatcher. This is where sticker rendering goes.
3. `src/view/com/composer/state/composer.ts` + composer UI — the
   composer's draft state reducer. This is where the emoji picker and
   sticker-attach flow go.
4. `src/components/PostControls/` — the like/repost/reply/share row under
   each post. This is where a reaction affordance goes — genuinely new UI,
   not modifying an existing dispatch the way the other three are.

### 2.2 Rendering inline facets

`RichText.tsx` builds a list of React elements by walking
`richText.segments()` and checking each segment's known feature types:

```tsx
// src/components/RichText.tsx (current shape, abbreviated)
for (const segment of richText.segments()) {
  const link = segment.link
  const mention = segment.mention
  const tag = segment.tag

  if (mention && /* ... */) {
    els.push(<ProfileHoverCard>...</ProfileHoverCard>)
  } else if (link && /* ... */) {
    els.push(<InlineLinkText>...</InlineLinkText>)
  } else if (tag && /* ... */) {
    els.push(<RichTextTag ... />)
  } else {
    els.push(segment.text)          // <-- fallback for anything else
  }
  key++
}
```

`segment.mention`/`.link`/`.tag` are convenience getters that `@atproto/api`
doesn't have an equivalent for `blue.moji.richtext.facet`, since it's not a
first-party Bluesky type. Check the raw feature list instead, **before**
the final `else`:

```tsx
const bluemoji = segment.facet?.features.find(
  (f): f is BlueMojiRichtextFacet.Main => f.$type === 'blue.moji.richtext.facet',
)

if (mention && /* ... */) {
  // existing branch
} else if (link && /* ... */) {
  // existing branch
} else if (tag && /* ... */) {
  // existing branch
} else if (bluemoji) {
  els.push(
    <VerifiedBluemojiImage
      key={key}
      claim={bluemoji}
      fallbackText={segment.text}
      emojiMultiplier={emojiMultiplier}
    />,
  )
} else {
  els.push(segment.text)
}
```

`VerifiedBluemojiImage` is new — a small component you write that:

1. Looks up (and caches — see §2.6) the real `blue.moji.collection.item`
   for `bluemoji.did` + the rkey derived from `bluemoji.name` (§0.3).
2. If verification succeeds, renders an inline `<Image>` sized to the
   surrounding text (`emojiMultiplier` already exists in this component for
   exactly this — reuse it rather than hardcoding a size), using the
   **verified** record's `formats`/`adultOnly`, never the claim's.
3. If verification fails or is still loading, falls back to `segment.text`
   (the colon-wrapped name) — same failure mode RichText already uses for
   unrecognized/invalid facets elsewhere in this file.

You'll need to teach the local copy of `@atproto/api`'s lexicon types about
`blue.moji.richtext.facet` (either via the generated types from
`@aendra/bluemoji`, or your own codegen against
[`lexicons/blue/moji/richtext/facet.json`](lexicons/blue/moji/richtext/facet.json))
so `segment.facet?.features` type-checks against something other than
`unknown`.

### 2.3 Rendering sticker embeds

`parseEmbed()` in `src/types/bsky/post.ts` is a chain of `AppBskyEmbed*.
isView(embed)` checks, each testing the raw `$type`:

```ts
export function parseEmbed(embed: AppBskyFeedDefs.PostView['embed']): Embed {
  if (AppBskyEmbedImages.isView(embed)) {
    return { type: 'images', view: embed }
  } else if (/* gallery, external, video, record, recordWithMedia ... */) {
    // ...
  } else {
    return { type: 'unknown', view: null }
  }
}
```

Add a case before the final `else`, and add `'sticker'` to the `Embed`
union type at the top of the same file:

```ts
export type Embed =
  | { type: 'images'; view: $Typed<AppBskyEmbedImages.View> }
  // ... existing variants ...
  | { type: 'sticker'; view: BlueMojiEmbedSticker.Main }
  | { type: 'unknown'; view: null }

export function parseEmbed(embed: AppBskyFeedDefs.PostView['embed']): Embed {
  if (AppBskyEmbedImages.isView(embed)) {
    return { type: 'images', view: embed }
  } else if ((embed as { $type?: string })?.$type === 'blue.moji.embed.sticker') {
    return { type: 'sticker', view: embed as BlueMojiEmbedSticker.Main }
  } else if (/* ... */) {
    // ...
  }
}
```

Then in `src/components/Post/Embed/index.tsx`, add a `'sticker'` case to
the `MediaEmbed` switch (it lives alongside `'images'`/`'gallery'`/`'link'`/
`'video'`) routing to a new `StickerEmbed` component you model after the
existing `ImageEmbed.tsx` — same job (verify, render at full size, respect
moderation), different verification step: resolve
`embed.view.sticker.record` (a `com.atproto.repo.strongRef` — this is your
verification anchor, more direct than re-deriving the rkey from `name`) and
render _its_ `stickerFormats`, not the embed's self-attested `formats`.

### 2.4 Composer: emoji picker and sticker attach

The composer's draft state (`src/view/com/composer/state/composer.ts`) is a
reducer over a `PostDraft`, where `embed: EmbedDraft` already distinguishes
several attachment kinds:

```ts
type GifMedia = { type: "gif"; gif: Gif; alt: string };

export type EmbedDraft = {
  quote: Link | undefined;
  media: ImagesMedia | GalleryMedia | VideoMedia | GifMedia | undefined;
  link: Link | undefined;
};

export type PostAction =
  | { type: "update_richtext"; richtext: RichText }
  // ...
  | { type: "embed_add_gif"; gif: Gif }
  | { type: "embed_update_gif"; alt: string }
  | { type: "embed_remove_gif" };
```

`GifMedia` is the closest existing analog to a Bluemoji sticker attachment
— both are "a reference to an externally-hosted image, not a raw upload
the user picked from their camera roll." Add a `StickerMedia` variant the
same way:

```ts
type StickerMedia = { type: 'sticker'; item: VerifiedBluemojiItem }

export type EmbedDraft = {
  quote: Link | undefined
  media: ImagesMedia | GalleryMedia | VideoMedia | GifMedia | StickerMedia | undefined
  link: Link | undefined
}

export type PostAction =
  | /* ... */
  | { type: 'embed_add_sticker'; item: VerifiedBluemojiItem }
  | { type: 'embed_remove_sticker' }
```

with reducer cases mirroring `embed_add_gif`/`embed_remove_gif` exactly
(set/clear `state.embed.media`).

For **inline** emoji (as opposed to a full sticker attachment), the
insertion point is wherever the composer already inserts a mention at the
cursor (`insertMentionAt` in `src/lib/strings/mention-manip.ts`) — write an
equivalent that inserts the colon-wrapped alias as plain text and lets your
copy of `detectFacets()` (see `@aendra/bluemoji`'s `BluemojiRichText`, which
already extends `@atproto/api`'s `RichText` for exactly this) pick it back
up as a real facet on submit, rather than hand-constructing a facet object
in composer state.

The picker UI itself is genuinely new — there's no existing "emoji picker"
in `social-app` to extend (only an emoji _keyboard_ input helper, which is
for real Unicode emoji, not Bluemoji). `@aendra/bluemoji` ships
`<blue-moji-picker>`, a debounced search-as-you-type Custom Element (see
[`lib/src/components/webcomponent/picker.ts`](lib/src/components/webcomponent/picker.ts))
you can wrap in a React Native Web-compatible dialog; for native
(iOS/Android), you'll want a RN-native equivalent calling the same
`blue.moji.collection.searchItems` query (`repo` param scoped to the
composing user's own collection is almost certainly what you want here —
see the query's own docs on the two distinct matching modes before wiring
network-wide search into a live-typing picker).

### 2.5 Reactions UI

Bluesky has no reaction concept today, so this is additive UI, not a
modification of an existing dispatch. The natural home is
`src/components/PostControls/index.tsx`, which already composes
`RepostButton`, `PostMenuButton`, `ShareMenuButton`, etc. as siblings via
the shared `PostControlButton` primitive. Add a `ReactionButton` alongside
them following the same shape as `RepostButton.tsx` (a button that opens a
picker dialog on press, backed by a mutation hook analogous to
`usePostRepostMutationQueue`), and a small hydrated-count display next to
it, backed by `blue.moji.feed.getReactionCounts` for feed contexts (one
batched call per screenful of posts, not one `getReactions` call per post —
see this repo's `server/get-reaction-counts.ts` and the AppView bug
noted in §2.6 before you build the batching call site) and
`blue.moji.feed.getReactions` for the full picker/actor-list view on an
open thread.

### 2.6 Verification checklist

Before shipping any of the above, confirm:

- [ ] Inline facet rendering re-derives from `blue.moji.collection.getItem`
      (or your AppView's equivalent verified lookup), never trusts the
      facet's own `formats`/`adultOnly`/`labels`.
- [ ] Sticker embed rendering does the same via the embed's `record`
      strong ref.
- [ ] Reaction rendering only ever displays counts/images your AppView
      already verified (if you're calling an existing AppView's
      `getReactions`/`getReactionCounts`, this is already done for you —
      confirm the AppView you're pointing at actually does this rather than
      passing through raw claims).
- [ ] You have a cache in front of the verification lookup — every facet on
      every post doing a live network round-trip per render is a real
      performance problem at Bluesky's scale. If you're running your own
      AppView, this is a local index hit already; if you're calling a
      remote one, cache by `(did, rkey)` with a reasonable TTL.
- [ ] You're aware of the hatk-specific array-query-param dispatch bug
      documented in this repo's `CLAUDE.md` (gotcha #8) if you're calling
      an AppView built on hatk with a batched, multi-URI query param —
      standard `@atproto/xrpc`-style clients (including `@aendra/bluemoji`)
      will silently only get results for the last URI until that's patched
      upstream. Not your bug to fix, but worth knowing if a batch call
      looks like it's dropping results.

### 2.7 Fork maintenance considerations

Each of §2.2–2.5 touches a file `social-app` actively develops, so plan for
merge conflicts on every upstream sync, roughly in this order of risk:

- **Lowest risk**: §2.5 (new files, a new sibling component in an existing
  composition — conflicts only if upstream restructures `PostControls`
  itself).
- **Medium**: §2.3 (`parseEmbed`'s `if`/`else if` chain and the `Embed`
  union both get new cases from upstream fairly often as Bluesky ships new
  embed types — expect to rebase this one regularly).
- **Highest**: §2.2 (`RichText.tsx`) and §2.4 (composer state) — both are
  core, frequently-touched files. Keep your diff as small and localized as
  possible (a single `else if` branch, a single new union member) rather
  than restructuring the surrounding code, so `git rebase`/merge tooling
  has the best chance of applying your patch cleanly against upstream's
  changes.

If maintaining a full fork sounds like more than you want to take on, note
that **read-only rendering alone (§2.2–2.3, skip §2.4–2.5)** gets you most
of the user-visible value — people can see Bluemoji in posts made by
other clients — for a much smaller, lower-conflict diff. That's a
reasonable place to stop.

---

## Track B: Independent, non-microblogging apps

This track assumes you're **not** forking `social-app`, and makes no
assumption about your backend — not hatk, not any particular database or
language. If you _are_ considering hatk, this repo itself is a complete
reference implementation; skim `server/` and `hatk.config.ts` instead of
this section.

### 3.1 What you actually need, by ambition level

| You want to...                             | You need                                                              |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Show existing Bluemoji sent to your app    | Blob-URL construction (§0.4) + verification (§0.1) — no writes at all |
| Let users react to something with Bluemoji | The above, plus writing `blue.moji.feed.reaction` records             |
| Let users upload/create Bluemoji           | The above, plus writing `blue.moji.collection.item` (and its blobs)   |
| Let users curate/share collections         | The above, plus `blue.moji.packs.pack`/`packitem`                     |
| Do all of this without polling every read  | Your own indexer (§3.5), or point at an existing AppView              |

You do **not** need ATProto/PDS accounts for your users at all if your app
isn't itself federated — nothing stops you from treating `blue.moji.*` as
"just a JSON schema for emoji with cryptographic provenance," writing
records to a PDS you control on your users' behalf (custodial, the way many
non-social ATProto apps work today), or even just reading the public
network's existing Bluemoji corpus into a completely closed app.

### 3.2 Minimal viable integration: read-only rendering

This is exactly [RENDERING.md](RENDERING.md) — go there. It's genuinely
that small: detect the facet, build a blob URL from `did` + a CID, fall
back to text. Add verification (§0.1) before you trust `adultOnly` for
anything, but rendering itself needs no ATProto SDK, no indexer, nothing
beyond an HTTP client and a DID resolver.

### 3.3 Writing: uploads, packs, reactions

Writing a `blue.moji.collection.item` (or any `blue.moji.*` record) is
standard ATProto repo writes — `com.atproto.repo.uploadBlob` for each
image rendition, then `com.atproto.repo.createRecord` (or `putRecord`,
since the record key is deterministic from the alias — see §0.3, and use
`putRecord` so re-uploading the same alias updates rather than
duplicates) with `collection: "blue.moji.collection.item"`. Nothing
Bluemoji-specific about the write mechanics; the lexicon schemas in
[`lexicons/blue/moji/`](lexicons/blue/moji/) are the contract.

Concretely, for a 128px static PNG emoji with no sticker rendition:

```json
{
  "$type": "blue.moji.collection.item",
  "name": ":blobcat:",
  "alt": "A round blue cat",
  "createdAt": "2026-07-08T12:00:00.000Z",
  "adultOnly": false,
  "formats": {
    "$type": "blue.moji.collection.item#formats_v1",
    "png_128": {
      "$type": "blob",
      "ref": { "$link": "<cid>" },
      "mimeType": "image/png",
      "size": 12345
    }
  }
}
```

written to `at://{yourDid}/blue.moji.collection.item/{aliasToRkey(":blobcat:")}`.

A few things worth internalizing before you build your own upload flow,
learned the hard way in this repo:

- **Always write `formats_v1`, never `formats_v0`.** `formats_v0`'s
  animated/vector fields (`apng_128`, `lottie`) are raw `bytes`, not
  `blob` — invisible to blob-based moderation pipelines and requiring an
  extra `getRecord` round-trip just to render. `formats_v1` makes every
  rendition a real blob. Keep reading `formats_v0` for backwards
  compatibility with old records; never write it.
- **Resize before you upload, and don't skip animated formats.** It's easy
  to ship a v1 that uploads the user's original file byte-for-byte into a
  "128px" slot regardless of its actual dimensions — this repo shipped
  exactly that bug for APNG uploads for a while (see ROADMAP.md's Phase 4.7
  entry). If you support animation, transcode to a real animated format
  (WebP is well-supported and small; APNG has poor server-side tooling
  support — imgproxy notably still can't resize it on demand as of this
  writing, see [imgproxy#1222](https://github.com/imgproxy/imgproxy/issues/1222))
  and actually resize, don't just re-wrap the original bytes.
- **`stickerFormats`'s presence, not a `kind` field, marks an item as
  sticker-capable.** An item with only `formats` is inline-only; one with
  `stickerFormats` too can also be attached as a full-size post embed.
  Don't invent a separate enum for this.

Reactions (`blue.moji.feed.reaction`) and packs (`blue.moji.packs.pack`/
`packitem`) follow the same "just a repo write" pattern — see
[`lexicons/blue/moji/feed/reaction.json`](lexicons/blue/moji/feed/reaction.json)
and [`lexicons/blue/moji/packs/`](lexicons/blue/moji/packs/) for the exact
shapes, and RFC 0002 (packs)/RFC 0004 (reactions) for the design rationale
if you're curious why a field is shaped the way it is.

### 3.4 Verification without an AppView, in pseudocode

If you're rendering facets live (no indexer of your own, no AppView to
call) but still want real verification rather than trusting claims:

```
function verifyBluemojiClaim(claim):
    # claim = { did, name, formats, adultOnly, ... } from a facet/embed/reaction
    rkey = aliasToRkey(claim.name)  # §0.3 — never claim.name.replace(':', '')
    pds = resolvePds(claim.did)      # DID doc -> AtprotoPersonalDataServer endpoint
    record = getRecord(pds, claim.did, "blue.moji.collection.item", rkey)

    if record is null:
        return UNVERIFIED  # render fallback text, don't show an image

    # The verified record, not the claim, is what you render from:
    return VERIFIED(
        formats = record.value.formats,
        adultOnly = record.value.adultOnly,
        labels = record.value.labels,
    )
```

This is a live `com.atproto.repo.getRecord` call per unique `(did, name)`
pair — cache aggressively (records are immutable once you've fetched them,
short of the original poster deleting/editing, so a long TTL is safe) and
consider it the honest cost of not running an indexer. Everything past this
point (§3.5) exists specifically to turn this into a local lookup instead.

### 3.5 Building your own indexer (if you want one)

You don't need hatk, or even a framework at all, to index `blue.moji.*` —
the mechanics are the same as any ATProto AppView, scoped to one namespace:

1. **Subscribe to a firehose.** Either `com.atproto.sync.subscribeRepos` on
   a relay directly, or [Jetstream](https://github.com/bluesky-social/jetstream)
   (a JSON-over-websocket wrapper around the same event stream, much easier
   to consume from non-Go languages) with
   `wantedCollections=blue.moji.collection.item&wantedCollections=blue.moji.packs.pack&...`
   — filter server-side at the Jetstream layer rather than firehose-side,
   since raw firehose is unfiltered and Bluemoji volume is a rounding
   error against total network traffic.
2. **On each commit event for a `blue.moji.*` collection**, verify the
   commit signature belongs to the claimed repo (your firehose/Jetstream
   client library should already do this — this is _the_ step that makes
   an indexed record trustworthy where a self-attested claim isn't, so
   don't skip it even though it's usually invisible plumbing), then upsert
   a normalized row into your own storage.
3. **Backfill on first boot** (or when picking up a new collection): walk
   `com.atproto.sync.listRepos` + `com.atproto.repo.listRecords` per known
   repo, or use a relay's bulk backfill API if it offers one, to seed
   existing records the live firehose won't replay.
4. **Serve verified reads from your own storage**, not from re-fetching the
   PDS per request — that's the entire point of doing this.

The one hard-won trap worth calling out explicitly, because it's expensive
to discover by accident: **don't index every collection your lexicon
directory happens to contain.** If your indexer's collection allowlist is
implicit (e.g. "whatever lexicon files exist on disk") rather than
explicit, and you're also vendoring lexicons you don't intend to index
(`app.bsky.*` types for cross-referencing, say), you can end up
auto-subscribing to and backfilling the **entire network's** activity for
those collections. This repo hit exactly this failure mode with vendored
`app.bsky.feed.postgate`/`threadgate` lexicons before scoping the indexer's
`collections` allowlist explicitly to `blue.moji.*` — see `hatk.config.ts`'s
comment on this and CLAUDE.md gotcha #1 for the full story. Make your
indexed-collections list an explicit, reviewed allowlist, not an implicit
consequence of what's in a directory.

If building and operating this yourself is more than you want to take on:
**you don't have to.** Nothing stops you from calling an existing AppView's
public read queries (`blue.moji.collection.getItem`, `getReactions`,
`getPack`, etc.) the way any ATProto client calls any other AppView's XRPC
— you get verified reads without operating any indexing infrastructure at
all, at the cost of depending on someone else's uptime and rate limits.

### 3.6 UI-less integrations

Bots, CLI tools, and server-to-server integrations need none of the
rendering guidance above — just the write mechanics (§3.3) and, if you're
reading Bluemoji rather than only writing it, the verification step (§3.4)
before acting on a claim. A moderation bot that reacts to reports, a CLI
that bulk-uploads a folder of images as a pack, a webhook that mirrors
Bluemoji reactions into another system — all of these are "read/write
records, verify before trusting," nothing more.

---

## 4. Reference

- **Lexicons**: [`lexicons/blue/moji/`](lexicons/blue/moji/) — the
  normative schema for everything in this guide.
- **RFCs** (design rationale, not just the "what"):
  [0001](rfcs/0001-core.md) (core emoji + self-attestation amendment),
  [0002](rfcs/0002-packs.md) (packs),
  [0003](rfcs/0003-stickers.md) (stickers),
  [0004](rfcs/0004-reactions.md) (reactions),
  [0005](rfcs/0005-internationalised-aliases.md) (internationalised
  aliases).
- **Reference implementations**:
  - This repo (`moji.blue`) — a complete hatk-based AppView + SvelteKit
    client. `server/` for verified-read query handlers, `app/` for a full
    rendering/composing UI.
  - [`@aendra/bluemoji`](lib/) — npm package with generated types for
    every lexicon here, `BluemojiRichText` (facet detection for
    composing), a `render()` helper, and the `<blue-moji-picker>`/
    `<blue-moji>` web components.
- **[RENDERING.md](RENDERING.md)** — the 20-line quick-start this guide
  expands on.
- **[ROADMAP.md](ROADMAP.md)** — what's shipped, what's in progress, and
  the reasoning behind design decisions made along the way (useful if a
  choice in this guide looks arbitrary — it's very possibly the second or
  third approach tried, with the first two documented as to why they
  didn't work).
