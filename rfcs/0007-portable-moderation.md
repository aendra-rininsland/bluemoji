- Start Date: 2026-10-18
- RFC PR:
- Bluemoji Issue:

# Summary

Make moderation decisions about Bluemoji content (taking an emoji or account
down, flagging an emoji as adult or abusive) available to anyone who renders
Bluemoji, not only to clients of the moji.blue AppView, by publishing them as
standard ATProto labels from a labeler service that any client or AppView can
subscribe to.

**Status: draft for discussion.** Nothing here is implemented.

# Motivation

Bluemoji is meant to work without moji.blue (RFC 0001; RENDERING.md). A
renderer can already verify an emoji claim against the owner's repo with a
single `getRecord`, so it has no need to call our `getItem`.

The gap is moderation. Today a takedown exists only inside the moji.blue
AppView: `getItem` returns "not found" for a taken-down account, and the image
proxy and caches are purged (PR #11). A client that verifies directly against
the PDS never learns of it. That makes the safe path (call moji.blue) and the
independent path (talk to the PDS) differ in behaviour, which pushes everyone
toward the first. We want independence to be safe, not just possible.

# Detailed design

Publish moderation outcomes as `com.atproto.label.defs#label` records from a
labeler (a service with an `app.bsky.labeler.service` declaration) so they
travel through machinery clients already have, rather than a new Bluemoji
protocol.

- **Subject:** the AT-URI of the `blue.moji.collection.item` record (or the
  account DID for an account-level action).
- **Values** (all `!`-prefixed system values where the existing semantic
  applies, custom values otherwise):
  - `!takedown` on an item or account: do not render.
  - `bluemoji-adult`: the emoji is adult-only, overriding a missing or false
    `adultOnly` on the record.
  - `bluemoji-abusive` / `bluemoji-impersonation`: render as text and offer a
    report path (details to be settled).
- **Negation** (`neg: true`) lifts a label, so reinstatement is expressible.
- **Consumers:** `verifyEmojiClaim()` gains an optional `labelers` list; for
  each, it checks labels on the item URI and the owner DID (via
  `com.atproto.label.queryLabels`, or a subscription for hosts that keep state)
  and returns the verdict alongside the item. The moji.blue AppView keeps
  applying its own decisions and additionally publishes them as labels, so
  both paths agree.
- **Trust:** a client chooses which labelers it honours, exactly as with
  Bluesky moderation. Bluemoji ships a reference labeler; others can run their
  own policy.

# Drawbacks

- Operating a labeler is real work: key management, a signed label stream,
  uptime, and a place to publish the declaration.
- Labels are advisory. A client that ignores them can render a taken-down
  emoji. This is inherent to a decentralised design; the AppView's authority
  over its own views and cache is unchanged.
- Latency: a label has to reach the consumer before it takes effect, so
  clients that cache aggressively need an invalidation story (the `/img`
  proxy's immutable caching is a known tension, since it is keyed by CID, not
  by moderation state).

# Alternatives

- **A Bluemoji-specific moderation feed/endpoint.** Simple, but a new protocol
  nobody else implements; labels already have clients, tooling and a trust
  model.
- **Rely on PDS-level takedowns.** The PDS operator may take a repo down, which
  already hides its records from getRecord, but that is the operator's policy,
  not ours, and does nothing for content on a PDS that chooses not to act.
- **Do nothing:** keep moderation as an AppView feature and document that
  independent clients do their own. Honest, but it means the independent path is
  strictly less safe.

# Adoption strategy

1. Run the labeler alongside the AppView, mirroring existing decisions (the
   takedown poller in `_takedown-watch.ts` is the natural source of events).
2. Add `labelers` to `verifyEmojiClaim()`; document it in RENDERING.md.
3. Have the AppView consult the same labels, so there is one source of truth.

# Unresolved questions

- Which label values, and should `adultOnly` overrides be labels at all or
  stay a record property plus a report path?
- Which key signs the labels, and how is it rotated?
- How should an immutable-cached image (`/img/{did}/{cid}`) honour a label?
  Purge by URL works for our own edge but not for third-party caches.
- Does an account-level takedown need to be distinguishable from an item-level
  one for clients?
