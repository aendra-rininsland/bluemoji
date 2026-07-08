- Start Date: 2024-12-07
- RFC PR:
- Bluemoji Issue:

# Summary

Sharing features for Bluemoji. This proposal is non-normative.

# Basic example

Users are able to share Bluemoji with each other, and provide multiple Bluemoji
as a "pack".

# Motivation

This will facilitate adoption and make Bluemoji more accessible to users.

# Detailed design

Terminology

- _Bluemoji Pack_: A `blue.moji.packs.pack` record, which is a user's curation
  of specific Bluemoji into a shareable pack, intended to function similarly to
  how Starter Packs work.
- _Pack Item_: A `blue.moji.packs.packitem` record marking a Bluemoji's
  membership in a pack. It carries two AT-URIs — `subject` (the
  `blue.moji.collection.item`) and `pack` — plus `createdAt`. Membership
  records live in the pack curator's repo, but `subject` may point at items in
  _any_ repo, so packs can curate other people's emoji. AppViews ignore
  duplicate packitems for the same subject.

  **Naming (confirmed, 2026-07):** `packitem`, not `packItem`. This
  intentionally follows Bluesky's own convention for record-type NSID
  segments — compound words are lowercased with no separator (`postgate`,
  `threadgate`, `listitem`, `starterpack`), where camelCase is reserved for
  query/procedure NSIDs (`getPack`, `getActorPacks`, `putItem`). Every record
  type in `blue.moji.*` follows this: `pack`, `packitem`, `item`, `reaction`.
  Do not "fix" this to camelCase later — it would be inconsistent with the
  ecosystem it's meant to interoperate with.

Reads are AppView queries, following the `app.bsky.graph.starterpack` pattern:

- `blue.moji.packs.getPack` — hydrated `packView` plus paginated
  `packItemView`s (each embedding an `itemView` of the subject emoji).
- `blue.moji.packs.getActorPacks` — packs created by an actor.
- `blue.moji.packs.getPacks` — batch `packViewBasic` hydration by URI.

Copying a pack (or individual items) into one's own collection is a client
flow: fetch each subject's blobs from the owner's PDS, re-upload to the copier's
PDS, then write a `blue.moji.collection.item` with `copyOf` set to the source
AT-URI for provenance.

# Drawbacks

- Membership as separate records (rather than an array on the pack) means a
  pack's contents can only be assembled by an indexer; raw-PDS readers must
  list the curator's whole packitem collection and filter client-side.
- Because `subject` can reference third-party repos, deleting your emoji does
  not remove stale packitems pointing at it; AppViews must tolerate dangling
  subjects (and do — they simply drop unresolvable items from views).
- Copy flows duplicate blobs across repos by design (blobs cannot be referenced
  cross-repo). This is storage-inefficient but is what makes packs
  fault-resistant: a copied emoji survives the source account's deletion.

# Alternatives

- **An `items` array on the pack record** would make packs self-contained and
  PDS-readable, at the cost of write contention (every add/remove rewrites the
  record) and a size ceiling. Starter packs chose list-item records for the
  same reason; packitem follows suit.

# Adoption strategy

The [@moji.blue Bluesky user][moji.blue] is intended to provide a number of
useful features, such as alerting whenever a new Bluemoji record has been
created and providing a link to let users copy new record to their repos.
Several custom feeds showing people using Bluemoji are also planned. It may
eventually provide usage stats as well ("Weekly Top Bluemoji", "Weekly Top Emoji
Copies", et cetera).

Additionally, Bluemoji Packs are intended to let users copy curated groupings of
Bluemoji provided by other users, similar to how Starter Packs let users follow
individual or every user from a curated list. This is hoped to give users the
ability to quickly and easily begin using Bluemoji without having to
painstakingly build a collection from uploading or copying individual records.

# How we teach this

tktk

# Unresolved questions

tktk
