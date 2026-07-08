# Bluemoji Roadmap

_Last updated: 2026-07-08 (Phase 1 hygiene pass). Combines the lexicon
adoption review, ship plan, and mature-version ideation into one document.
Update the Status section as items land._

## Status snapshot

Shipped and live at <https://moji.blue> (Railway project "Bluemoji", service
`moji.blue`, Cloudflare in front):

- **Core emoji**: `blue.moji.collection.item` upload/collection UI, inline
  facet rendering on post pages, 128px renditions.
- **Packs** (RFC 0002): create/share/copy at `/packs`, AppView queries
  `getPack`/`getActorPacks`/`getPacks`.
- **Stickers** (RFC 0003): `stickerFormats` on items (presence = sticker-
  capable), `blue.moji.embed.sticker` post embed, 512px generation on upload,
  rendering on post pages.
- **Reactions** (RFC 0004): `blue.moji.feed.reaction` records,
  `getReactions` aggregation, reaction bar + picker on post pages.
- **Internationalised aliases** (RFC 0005): Punycode `xn--` rkeys, Unicode
  alias support end-to-end, relaxed ASCII rule.
- **Infrastructure**: `/img/{did}/{cid}` immutable blob proxy; indexing
  scoped to `blue.moji.*`; OAuth issuer on moji.blue.
- **Standard hygiene** (Phase 1, below — done except item 4): `formats_v0`
  deprecated; facet/sticker/reaction self-attestation now verified against
  indexed items (`blue.moji.collection.getItem`, `get-reactions.ts`, the
  post-page renderer) instead of trusted blindly; `listCollection` gained a
  public `repo` param; `adultOnly` now propagates end-to-end from the
  verified source item (an 18+ badge renders on inline emoji, stickers, and
  reactions); `packs.packitem` naming confirmed and documented.

## Phase 1 — Standard hygiene (before promoting adoption)

One item remains; the rest landed 2026-07-08 (see CLAUDE.md's "Core design
decisions" and RFC 0001's self-attestation amendment for what changed and
why — this isn't just documentation, the verification is load-bearing code
in `server/get-item.ts`, `server/get-reactions.ts`, and the post-page loader).

1. **Publish lexicons as `com.atproto.lexicon.schema` records** under the
   moji.blue DID so they resolve in lexicon browsers (`pdsls`, lexicon.
   directory etc.). Bluesky tooling increasingly expects this. Not yet done —
   this is a one-time operational action (write the records via the moji.blue
   account), not a code change.

Done:

2. ~~Deprecate `formats_v0`~~ — marked deprecated in lexicon descriptions and
   RFC 0001; the AppView already normalised to v1 on write.
3. ~~Facet/emojiRef self-attestation~~ — `blue.moji.collection.getItem` is a
   new verified-lookup query; `get-reactions.ts` rebuilds every `emojiRef`
   from the indexed item (dropping unverifiable reactions); the post-page
   loader verifies every facet/sticker claim before rendering an image.
4. ~~`listCollection` repo param~~ — added, public read, cursor-paginated,
   `reverse` flag mirrors `com.atproto.repo.listRecords` semantics.
5. ~~Self-label propagation~~ — `adultOnly` now flows from the verified item
   through facets, stickers, and reactions (new `emojiRef.adultOnly` field);
   the reference client shows a small "18+" badge + outline rather than
   hiding content (full viewer-preference moderation is a separate, larger
   Phase 2 item).
6. ~~`packs.packitem` naming~~ — confirmed against Bluesky's own
   `postgate`/`threadgate` convention and documented in RFC 0002 + CLAUDE.md
   so it isn't "corrected" to camelCase later.

## Phase 2 — Launch operations

1. **Cloudflare cache rule** (30s, dashboard): Rules → Cache Rules, URI Path
   starts with `/img/` → Eligible for cache. Origin already sends
   `immutable, max-age=1y`. Until this is set, `cf-cache-status` stays
   DYNAMIC and every emoji render hits Railway.
2. **Moderation before scale**: wire `dev.hatk.createReport` into the UI;
   define the Ozone story (packs are a distribution amplifier for bad
   content, and stickers raise the stakes vs. 128px glyphs). hatk labels +
   `_reports` table exist; takedown filtering is already in every query.
3. **@moji.blue bot** (RFC 0002 adoption strategy): announce new Bluemoji,
   provide copy links; custom feeds of posts using Bluemoji.
4. **Publish `@aendra/bluemoji` v5**: sticker + reaction + alias exports are
   in the tree; needs a version bump and `npm publish` from `lib/`
   (`prepublishOnly` runs the build).
5. **Backfill/monitoring hygiene**: watch Railway memory after the
   `NODE_OPTIONS=--max-old-space-size=4096` bump; the `_repos` backlog from
   the unscoped first deploy drains junk repos once. Consider `hatk reset`
   of the prod volume for a clean start before public launch (all data is
   re-derivable from the network).

## Phase 3 — Adoption push

The standard lives or dies on one or two third-party clients. Realistic first
movers: deer.social forks, Klearsky, TOKIMEKI, Ouranos.

- Write a "render Bluemoji facets in 20 lines" doc; the web component in
  `lib/src/components/webcomponent/` is the demo.
- **Reactions are the lowest-friction entry point**: read-only support needs
  only `getReactions` + blob URLs — no composer integration. Pitch that
  first.
- Post-page renderer at `moji.blue/profile/{handle}/post/{rkey}` doubles as
  a fallback link target for clients that don't render facets.
- Get one artist to publish a flagship pack; packs are the shareable unit
  that spreads on-network.

## Phase 4 — Mature Bluemoji (ideation)

- **Emoji picker as infrastructure**: a `blue.moji.collection.searchItems`
  XRPC + hosted picker web component, so clients get `:`-autocomplete
  without indexing anything themselves. (hatk has FTS via `ctx.search`.)
- **Reactions everywhere**: batch `getReactions` for timelines (multi-uri
  param); notifications ("X reacted to your post") via hatk push;
  per-post reaction caps (Discord-style) as AppView policy.
- **Community/shared namespaces**: packs owned by community or feed-gen
  accounts with delegation — the Discord "server emoji" model mapped onto
  ATProto identity.
- **Trending & discovery**: firehose-derived usage stats ("Weekly Top
  Bluemoji"), public gallery at moji.blue, OpenGraph cards for pack embeds
  (hatk has an `og` module).
- **Verified/first-party sets**: artists publish signed packs; `copyOf`
  chains already give attribution for "created by" credits and tip-jar
  links.
- **Sticker composer**: pick sticker → attach to post; later,
  `recordWithMedia`-style composition (sticker + quote post) per RFC 0003's
  open question.
- **Animated pipeline**: server-side APNG→animated-WebP transcode (the
  imgproxy#1222 blocker from RFC 0001) so animation works through CDNs;
  Lottie sandboxing guidance for renderers.
- **Interop bridges**: import Slack/Discord/Mastodon emoji archives; export
  packs as Signal-style bundles.
- **Cloudflare-native port** (optional cost play): Workers + D1 + a
  cron-triggered Jetstream drain (`wantedCollections=blue.moji.*`) fits the
  free plan because Bluemoji event volume is tiny. The trap: do NOT hold the
  firehose socket in a Durable Object (no hibernation for outbound sockets;
  an always-on DO eats ~83% of the free duration quota). This is a rewrite
  of hatk's server half — only worth it if the ~$5/mo Railway bill matters.

## Strategic note

Everything in Phase 4 gets cheaper once the AppView is authoritative for
hydration — which it now is. With Phase 1's substantive items done, the
schema surface is stable enough to start Phase 3's adoption push in parallel
with Phase 2's launch ops; only the lexicon-publishing step (Phase 1 item 1)
blocks lexicon-browser discoverability specifically, nothing else.
