- Start Date: 2026-07-07
- RFC PR:
- Bluemoji Issue:

# Summary

Custom-emoji reactions to posts: `blue.moji.feed.reaction` records, aggregated
by AppViews via `blue.moji.feed.getReactions`.

# Basic example

```json
{
  "$type": "blue.moji.feed.reaction",
  "subject": "at://did:plc:xyz/app.bsky.feed.post/3kabc",
  "subjectCid": "bafy...",
  "emoji": {
    "uri": "at://did:plc:abc/blue.moji.collection.item/blobcat",
    "name": ":blobcat:",
    "formats": {
      "$type": "blue.moji.richtext.facet#formats_v1",
      "png_128": "bafk..."
    }
  },
  "createdAt": "2026-07-07T00:00:00.000Z"
}
```

# Motivation

Custom-emoji reactions are the most-missed feature for users arriving from
Mastodon, Discord and Slack. Bluesky's `app.bsky.feed.like` is a fixed glyph;
Bluemoji already provides the asset layer, alias namespace and moderation story
needed to generalise it. Reactions also give Bluemoji a use that requires _no
composer integration_ from third-party clients — a reaction bar can be bolted
onto any post view — making it a lower-friction adoption path than facets.

# Detailed design

- **Record** (`blue.moji.feed.reaction`, tid key) lives in the reactor's repo,
  like a like. `subject` is a flat AT-URI (plus optional `subjectCid`) rather
  than a strongRef object so naive indexers can query by column.
- **`emojiRef`** denormalizes the Bluemoji: item AT-URI, colon-wrapped `name`
  (fallback text), and the facet's CID-string `formats` union, so any consumer
  can render the glyph from firehose data alone with zero round-trips. The
  owning DID is derived from the URI. Reacting with _someone else's_ emoji is
  allowed by design — the ref points wherever the item lives.
- **Dedup rule:** AppViews ignore duplicate (actor, subject, emoji URI)
  triples, mirroring the packitem rule.
- **Query** `blue.moji.feed.getReactions(uri)` returns aggregated
  `reactionGroup`s (grouped by emoji item URI, counting distinct actors,
  including the viewer's own reaction URI for un-reacting) plus a paginated
  list of individual `reactionView`s with hydrated actor profiles.

Writes are ordinary record creates/deletes through the user's PDS
(`repo:blue.moji.feed.reaction` OAuth scope).

# Drawbacks

- Reaction spam is cheap; AppViews should rate-limit per (actor, subject) and
  clients should cap displayed groups.
- The denormalized `emojiRef` is self-attested, like the facet; AppViews
  should verify against indexed items before trusting `formats`, and the
  emoji's self-labels (`adultOnly`) must be consulted at hydration time since
  the reaction record itself carries none. **Amendment (2026-07):**
  `emojiRef` gained an optional `adultOnly` field for exactly this purpose.
  The reference AppView's `getReactions` populates it from the verified
  source item — never from the reactor's own write — and drops any reaction
  whose claimed item can't be verified against the index at all (see RFC
  0001's self-attestation amendment).
- Subjects other than posts (e.g. reacting to a reply in another lexicon's
  thread model) are unspecified; `subject` accepts any AT-URI on purpose.

# Alternatives

- **Extending `app.bsky.feed.like` with an emoji field** — not ours to extend,
  and existing indexers would miscount likes.
- **strongRef `subject`** — cleaner semantics, harder indexing for simple
  consumers; the optional `subjectCid` recovers strong-reference semantics.

# Adoption strategy

The moji.blue AppView ships a reaction bar on post pages (react from your
collection, un-react, live counts). Because rendering reactions requires only
`getReactions` + blob URLs, a client can adopt read-only support in an
afternoon. `@aendra/bluemoji` ships generated types.

# Unresolved questions

- Should `getReactions` support multiple subjects (batch) for timeline views?
- Should there be a notification lexicon for "X reacted to your post", or is
  that an AppView/push concern?
- Per-post reaction caps (Discord-style) — spec or client policy?
