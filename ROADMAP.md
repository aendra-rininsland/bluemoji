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

1. ~~Cloudflare cache rule~~ — done, verified live: `/img/*` shows
   `cf-cache-status: MISS` then `HIT` on repeat requests, both before and
   after the 2026-07-08 redeploys.
2. ~~Moderation before scale~~ — `dev.hatk.createReport` is wired into the UI
   ("Report pack" + per-item report on pack pages; report affordances on
   post-page stickers and reaction chips). Report reasons are registered as
   `defineLabel()` identifiers in `server/labels/`. End-to-end tested via
   hatk's test harness (valid report → 200 + stored; bad label → rejected;
   unauthenticated → rejected). The Ozone story itself (how a human
   moderator actually reviews `_reports` and acts on them) is still
   undefined — intake works, the review workflow doesn't exist yet.
3. **@moji.blue bot** (RFC 0002 adoption strategy) — **not started, needs
   you**: this requires a live Bluesky account for @moji.blue and its
   credentials (app password or OAuth session) stored as a deploy secret, so
   it can post publicly under that identity. Not something to set up
   autonomously — the design (announce new Bluemoji, copy links, custom
   feeds, usage stats) is in RFC 0002 whenever you're ready to provision it.
4. ~~Publish `@aendra/bluemoji` v5~~ — **build fixed, ready whenever you want
   to `npm login` and publish**. The package genuinely had no working build
   (no `vite.config.ts` for library mode at all — `vite build` failed
   immediately trying to resolve `index.html` — and no `main`/`module`/
   `types`/`exports` in `package.json`). Rather than guess between
   "preserve the old 3.0.21 multi-entry shape" and "consolidate to the
   current single `src/index.ts`", did both: added `lib/vite.config.ts` +
   `lib/tsconfig.json` building three entries (`index`, `facet`, `render`),
   so `@aendra/bluemoji` (root) gets the richer unified export (facet +
   render + the new alias helpers) while `@aendra/bluemoji/facet` and
   `@aendra/bluemoji/render` keep working exactly as they did in 3.0.21 for
   anyone already depending on those subpaths. `package.json` now has real
   `main`/`module`/`types`/`exports` fields and `"type": "module"`; version
   bumped to `5.0.0` (`4.0.0` was in package.json but never actually
   published — 3.0.21 is still the latest on npm).

   Verifying the build actually ran surfaced a real latent bug, not
   something this session introduced: `lib/src/facet/detect-facets.ts`
   deep-imports `@atproto/api/src/rich-text/detection` (source, not a
   compiled entry point) — `@atproto/api` doesn't publicly export its own
   mention/link/tag facet detector, only `UnicodeString`. As a static
   top-level import this broke loading the _entire_ package under plain
   Node ESM resolution (every consumer, not just ones calling
   `detectFacets()`) — this was presumably always broken for any real npm
   consumer, just never caught because the build never ran to completion
   before. Fixed by (a) importing `UnicodeString` from the public
   `@atproto/api` entry instead of the deep path, and (b) deferring the
   unavoidable `@atproto/api/src/rich-text/detection` import to a dynamic
   `import()` inside `detectFacets()` itself (now `async`, `await`ed at
   both call sites) — so the package loads fine anywhere, and only calling
   `detectFacets()` outside a TypeScript-transpiling bundler (Vite, Metro,
   webpack+ts-loader) throws. That's an upstream `@atproto/api` gap, not
   fixable here without reimplementing mention/link/tag detection.

   Verified for real: built, then imported all three entry points via
   actual Node `import()` against the built `dist/` files (not just "did
   the build exit 0") — confirmed every expected export is present and
   `aliasToRkey`/`normalizeAlias`/`rkeyToAlias` work correctly through the
   built artifact. `npm whoami` has no local auth configured, so `npm
login` is still needed before `npm publish` — that step (and the
   publish itself) needs your go-ahead, not mine.

5. **Backfill/monitoring hygiene** — checked 2026-07-08: memory 206 MB
   current / 219 MB max over the last hour (8 GB limit), disk 138 MB / 500 MB
   (28%), zero 5xx errors. Healthy; no `hatk reset` needed right now. Revisit
   before public launch if the `_repos` backlog from the original unscoped
   deploy is a concern (all data is re-derivable from the network, so a
   reset is safe whenever you want a clean slate — just destructive and
   irreversible, so it needs your explicit go-ahead each time, not mine).

## Phase 3 — Adoption push

The standard lives or dies on one or two third-party clients. Realistic first
movers: deer.social forks, Klearsky, TOKIMEKI, Ouranos.

- ~~Write a "render Bluemoji facets in 20 lines" doc~~ — done, see
  [RENDERING.md](RENDERING.md): dependency-free snippet (detect the
  feature, build a `did`+CID blob URL, fall back to the colon-wrapped name),
  a verify-don't-trust callout linking RFC 0001's self-attestation
  amendment, and pointers to reactions/stickers/packs as easy next steps.
  Verified the exact snippet against realistic fixtures (happy path,
  formats_v0 fallback, XSS-in-`alt`/`name`) before publishing it. The web
  component in `lib/src/components/webcomponent/` is a fuller worked
  example for anyone who wants one.
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
