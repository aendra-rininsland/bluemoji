- Start Date: 2026-11-23
- RFC PR:
- Bluemoji Issue:

# Summary

Make Bluemoji respect the blocks (and, where possible, mutes) a person has
already set on Bluesky: someone you have blocked should not be able to put
their emoji in front of you, and a person who has blocked someone should not
see that account's reactions on their own posts.

**Status: draft for discussion.** Nothing here is implemented. Statements about
Bluesky's APIs are marked _(to verify)_ and need checking against the live
AppView before this is accepted.

# Motivation

Custom emoji put an image, chosen by its owner, into places the viewer never
chose to look at: an inline `:emoji:` in someone else's post, a reaction chip
under their own post, a sticker, a pack in search. Bluesky's block is the
user's tool for "this account's content stops reaching me", and Bluemoji
currently ignores it. A search of the AppView and the web app finds no handling
of blocks or mutes anywhere.

Concrete harms:

1. **A blocked account's art reaches you anyway.** A harasser you blocked
   publishes an offensive or targeted emoji. A third party posts it inline, or
   reacts with it, and you see their image on a post you are reading.
2. **A blocked account reacts to your posts.** Their reaction chip and their
   entry in the reactor list appear under your post. On Bluesky a blocked
   account cannot interact with your posts; here they can.
3. **Emoji owners cannot keep people away from their emoji.** Someone an owner
   has blocked can still use that owner's emoji.

The reported motivation came from an implementer of a second AppView
(issue #30 and their posts), who is building block handling because "upstream
doesn't handle blocks", and whose design is a useful data point (see
Alternatives).

Constraints this has to respect:

- **Blocks are public, mutes are private.** A block is a record in the
  blocker's repo (`app.bsky.graph.block`) that anyone can read. A mute is held by
  the viewer's own AppView and is not in any repo, so only an authenticated,
  viewer-scoped call can learn it. _(to verify)_
- **We must not index the whole block graph.** Indexing every block on the
  network means indexing a collection we do not otherwise need. hatk indexes a
  whole collection, and backfills every repo that writes one, once it is listed
  (CLAUDE.md gotcha #1, which has taken production down twice). Anything below
  that needs block data must get it by lookup.
- **`getItem` is cached for everyone.** It is cached at the edge (10 minutes,
  keyed by URL) and purged by URL when a record changes. A response that
  depends on who is asking would be served to the wrong person. **No
  viewer-dependent behaviour may ever be added to `getItem`.**
- **Reaction counts are precomputed**, so they cannot be exact per viewer.
- **Blocks are personal; labels and takedowns are global.** RFC 0007 covers
  "nobody should see this". A block is "I should not see this", and the two must
  not be conflated.

# Detailed design

## Definitions

- **Owner**: the account whose repo holds the `blue.moji.collection.item`.
  Derived from the emoji's AT-URI.
- **Poster** / **reactor**: the account that wrote the post (or facet) or the
  reaction.
- **Viewer**: the signed-in person looking at the page. May be absent.
- A **block relation** exists between two accounts if either has blocked the
  other. A **mute** is the viewer's own and one-directional.

## Rules

### R1. Rendering (clients, MUST)

When a client is about to draw an emoji image (inline facet, sticker,
reaction chip, pack tile) and the **viewer has blocked the emoji's owner**, it
draws the colon-wrapped text (`:name:`) instead. This is the same fallback
used for unverifiable and taken-down emoji, so it needs no new UI.

A client SHOULD apply the same rule when the **owner has blocked the viewer**,
if it already knows that relation. A client that does not know it is not
required to look it up.

A client SHOULD treat a **muted** owner like a blocked one for emoji
rendering, since the viewer has said they do not want to see that account's
content.

This rule is purely client-side. It needs no AppView change, works against any
AppView, and applies to emoji already in posts.

### R2. Reactions at ingest (AppViews, SHOULD)

When an AppView indexes a `blue.moji.feed.reaction` it checks, and drops from
all counts and lists, a reaction if there is a block relation between:

- the reactor and the **subject post's author**, or
- the reactor and the **emoji's owner**.

The first mirrors Bluesky's own handling of interactions. _(to verify)_ The
second lets an emoji owner keep a blocked account from using their emoji, and
stops a reactor from reacting with an emoji by someone they blocked.

Because counts are precomputed, the check runs once, at ingest. The AppView
learns relations by **lookup, not by indexing blocks**: a batched relationship
query for the (reactor, author) and (reactor, owner) pairs against the Bluesky
AppView (`app.bsky.graph.getRelationships` or equivalent), with results cached
for a bounded time. _(to verify)_ A failed lookup MUST NOT drop the reaction:
fail open and record it for re-check.

A block made **after** a reaction was indexed does not retroactively remove it
unless the AppView re-checks. An AppView MAY re-check a post's reactions when
it is requested after a cache expiry; it MUST NOT promise that blocks apply
instantly.

### R3. Viewer-filtered lists (AppViews, SHOULD)

For an authenticated request, `getReactions` (the per-reactor list and the
emoji groups) additionally drops reactions whose **reactor** or **emoji owner**
has a block relation with the **viewer**, and groups left empty. The
viewer-independent `count` on `getReactionCounts` is not adjusted: a number
that disagrees slightly with the list is the price of precomputed counts, and
the list is what the viewer sees. Responses MUST NOT distinguish "hidden by a
block" from "does not exist", so a response never reveals that someone blocked
the viewer.

Such responses are per-viewer. They MUST be sent `Cache-Control: private,
no-store` (or `Vary` on the credential) and never be put behind the edge cache.

### R4. What is deliberately not specified

- **`getItem`, `getPack`, `listCollection`** are cached and viewer-independent.
  They do not filter by block, and must not.
- **Search and featured/trending lists** MAY filter by the viewer's blocks for
  authenticated requests, under R3's caching rule, but the public
  unauthenticated results are unfiltered.
- **Posting**: nothing stops a record being written; the PDS accepts anything.
  All of this is about what is shown.
- **Copies** (`copyOf`) are separate emoji owned by the copier. A block of the
  original owner does not apply to a copy; the copier's own block status does.

## How a client learns the relation

A client that already has the viewer's graph state uses it. Otherwise, for the
distinct owner DIDs on screen, it makes one batched profile or relationship
lookup against Bluesky's AppView and caches it for the page. The viewer's own
block list (`app.bsky.graph.getBlocks`) covers the "viewer blocked owner" case
with no per-account lookup, but not "owner blocked viewer" or mutes. _(to
verify all of these against the live API)_

## Privacy

- An AppView that receives an authenticated request learns the viewer's block
  list only transiently. It MUST NOT store or log it, nor use it for anything
  except filtering that response.
- Dropping a reaction or hiding an emoji because of a block must not appear in
  any public record or response.

# Drawbacks

- **Cost.** R2 adds a lookup to reaction ingest; R3 adds one to each
  authenticated reaction read. Both need caching and a fail-open path.
- **Imperfect by design.** Blocks made after a reaction do not remove it until a
  re-check, and counts can disagree with lists.
- **Client burden.** R1 asks every renderer to learn a relation it may not have
  today. It is a SHOULD for the owner-blocked-viewer direction for that reason.
- **Social side effects.** R2's emoji-owner rule means a block silently stops
  someone using an emoji. That is the intent, but it is invisible to the person
  affected, as blocks are elsewhere.
- **Copying bypasses it.** Anyone can copy an emoji (when licensed) and use
  their own copy.

# Alternatives

- **Index `app.bsky.graph.block` and answer from our own database.** Exact and
  fast per request, but it means indexing and backfilling a very large
  collection across the network (gotcha #1). Rejected.
- **Do only R1 (client-side).** Cheapest, covers inline emoji and posts that
  already exist, and needs no AppView change. It cannot clean up reactor lists
  or counts. R1 is the minimum worth shipping; R2 and R3 build on it.
- **Handle blocks only at ingest** (the other AppView's current plan, as they
  have described it: drop reactions where the sender blocks or is blocked by the
  target or the emoji owner, and check the viewer against the emoji owner on
  view; viewer-versus-sender is skipped because counts are precomputed, possibly
  checked when reaction counts are low). R2 and R3 are written to agree with it.
- **Use labels** (RFC 0007). A block is personal, so a global label is the wrong
  tool.
- **An owner-managed deny list in the owner's repo.** More expressive, but a new
  lexicon and a new thing to teach. Possible follow-up.

# Adoption strategy

1. **Document R1 in RENDERING.md and the library**, with a small helper (for
   example `shouldRenderEmoji(ownerDid, relations)`) in `@aendra/bluemoji`. No
   lexicon change, no breaking change.
2. **Apply R1 in the moji.blue web app** for the viewer's own blocks.
3. **R2 then R3 in the moji.blue AppView**, after confirming the Bluesky API
   behaviour and the cost, with tests for fail-open and for the cache headers.
4. **Coordinate with other AppViews** so the semantics match, in particular the
   other AppView already building a version of R2 and R3.

# How we teach this

"Blocks work the way they do on Bluesky: if you blocked someone, you do not see
their emoji; if they blocked you, they do not see your reactions. Reactions you
see from people you blocked are hidden, and an emoji's owner can stop people
they blocked from using it." The reference implementation's behaviour becomes
the example, and RENDERING.md gets one short rule: **check the block before you
draw the image.**

# Unresolved questions

- Does Bluesky's AppView drop interactions that violate a block at ingest, or
  hide them at read time? R2's first rule should match whichever it is.
- What is the cheapest reliable lookup for "does A block B, for a set of pairs",
  without a viewer session? Is `getRelationships` available to us unauthenticated?
- Should a **mute** hide emoji rendering by default, or only if the user opts in?
- How long should relationship results be cached, given blocks are expected to
  take effect quickly?
- When should reactions be re-checked after a block: on read, on a timer, or
  by watching block events for the accounts involved?
- Should an emoji owner's block on a poster hide that owner's emoji in the
  poster's posts for other viewers? (Currently out of scope: it changes what
  third parties see.)
