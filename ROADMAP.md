# Bluemoji Roadmap

_Last updated: 2026-07-08. Combines the lexicon adoption review, ship plan,
and mature-version ideation into one document. Update the Status section as
items land._

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

## Phase 1 — Standard hygiene (before promoting adoption)

Remaining defects/frictions from the lexicon review, in priority order.
(Already fixed: `itemView` lacking `uri`/`did`; `saveToCollection` 15-char
name cap; alias regex inconsistency — see RFC 0005.)

1. **Deprecate `formats_v0`.** Dual unions are the single biggest adopter
   tax: every renderer must handle both, and v0's `bytes`-typed
   `apng_128`/`lottie` require a `getRecord` round-trip AND are invisible to
   image moderation tooling. Action: mark v0 deprecated in lexicon
   descriptions + RFC 0001; AppView normalises to v1 on write already;
   consider a migration sweep for existing v0 records.
2. **Facet/emojiRef self-attestation.** `blue.moji.richtext.facet` (and
   `reaction#emojiRef`) carry a self-attested `did` + format CIDs — nothing
   stops a post claiming someone else's emoji or pointing CIDs at unrelated
   blobs. Action: AppView SHOULD verify facet claims against indexed items at
   hydration and drop/flag mismatches; document in RFC 0001.
3. **`listCollection` has no `repo` param** — as specified it can only list
   the authed user's collection, making it impossible to browse someone
   else's emoji through the standard. It also defines a redundant local
   `itemView`. Action: add optional `repo` (at-identifier) param + handler.
4. **Publish lexicons as `com.atproto.lexicon.schema` records** under the
   moji.blue DID so they resolve in lexicon browsers (`pdsls`, lexicon.
   directory etc.). Bluesky tooling increasingly expects this.
5. **Self-label propagation**: clients consuming `viewSticker.labels` /
   facet `labels` need documented guidance; `adultOnly` on an emoji must be
   consulted when rendering reactions (the reaction record carries none).
6. Naming nit (decide once, before third parties encode it): `packs.packitem`
   is lowercase like Bluesky's `listitem` — fine, but confirm and document
   the convention.

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
hydration — which it now is. Prioritise Phase 1 items 1–3 before evangelising
the lexicons: schema changes get exponentially harder after third parties
encode them.
