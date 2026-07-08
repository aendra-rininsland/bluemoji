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

- ~~Emoji picker as infrastructure~~ — done: `blue.moji.collection.searchItems`
  (`server/search-items.ts`) has two real, distinct, verified matching modes
  — pass `repo` for substring matching within one repo's own collection
  (suits live-typing composer autocomplete: every keystroke narrows
  correctly), omit it for network-wide search via hatk's FTS (`ctx.search`),
  which turned out to match whole words/tokens rather than arbitrary
  substrings (confirmed live: "cat" finds `:blobcat:`, but "blob" alone does
  not) — documented honestly in the lexicon rather than oversold as generic
  substring search. `<blue-moji-picker>` (`lib/src/components/webcomponent/
picker.ts`) is a debounced search-as-you-type Custom Element dispatching a
  `moji-pick` event; verified in a real browser against a live local hatk
  server (correct URL construction, correct results for both matching
  modes, correct event payload on click, clean input-clear behaviour, no
  console errors). Shipped as raw source via new `package.json` exports
  entries (`./components/webcomponent/picker`), consistent with how the
  pre-existing `<blue-moji>` display component already shipped.
- ~~Reactions everywhere~~ — done, with one real limitation surfaced along
  the way:
  - **Batch `getReactionCounts`** (`server/get-reaction-counts.ts`): counts-
    only aggregation for many posts in one call. Building it surfaced a
    genuine hatk framework bug — its XRPC dispatch drops all but the last
    value of a repeated query key, so the ATProto-standard `uris=a&uris=b`
    array-param convention (what `@atproto/xrpc`-based clients, including
    our own `@aendra/bluemoji`, actually send) never reaches a handler as
    more than one value. Confirmed this also affects the pre-existing,
    already-shipped `getPacks` (latent — the packs UI never happened to call
    it with >1 uri). Worked around both endpoints server-side with a
    comma-joined-value fallback (`parseUriListParam` in `_pack-views.ts`;
    AT-URIs can't contain commas, so it's unambiguous) — but that only
    helps callers who build the query string by hand; standard client
    libraries need hatk's dispatch patched upstream to truly benefit from
    batching. Full writeup in CLAUDE.md's hatk gotchas #8. Verified with
    real seeded data: dedup/spoofing-override/fabricated-claim-dropping all
    correct, multi-subject batching correct via the comma workaround,
    zero-reaction subjects correctly omitted.
  - **Per-post reaction caps**: `MAX_REACTION_GROUPS = 20` (shared constant
    in `_pack-views.ts`) caps distinct emoji _groups_ shown per post — an
    AppView anti-spam policy, not a per-actor limit — applied identically in
    both `getReactions` and `getReactionCounts`. Verified live: seeded 25
    distinct reaction types on one post, both endpoints correctly capped at
    20, keeping the highest-count groups.
  - **Notifications** (`server/on-reaction-notify.ts`): a real `on-commit`
    hook fires on every new reaction and calls hatk's push interface. This
    is genuinely dormant today, not faked — hatk's push is APNs-only
    (requires a real iOS app's bundle ID + signing key), moji.blue has
    neither, and `ctx.push.send()` is expected to throw until someone
    registers a token. Wired up and ready; starts working the moment a real
    mobile client exists and registers push tokens, no code changes needed.
- **Community/shared namespaces**: packs owned by community or feed-gen
  accounts with delegation — the Discord "server emoji" model mapped onto
  ATProto identity.
- **Trending & discovery — done**: "Weekly Top Bluemoji" stats
  (`blue.moji.feed.getTrending`, `server/get-trending.ts`) rank custom emoji
  by distinct-reactor count over a `day`/`week`/`month` window, reusing the
  same self-attestation verification as `getReactions`/`getReactionCounts`
  (`_pack-views.ts`'s `verifiedEmojiRef`) so spoofed/deleted claims are
  dropped and taken-down accounts' items are excluded. Verified live: seeded
  a real item + 3 distinct-reactor reactions plus one reaction claiming a
  nonexistent item — the real one correctly ranked with count 3, the spoofed
  one correctly dropped; invalid `period` values correctly rejected. Public
  gallery page at `/gallery` (`app/routes/gallery/`, no auth required)
  renders this ranked list with day/week/month tabs, verified in a real
  browser (screenshot: `#1 :blobcat: 3 reactors` with an `18+` badge),
  linked from the homepage for both signed-in and signed-out visitors.
  Discovered along the way: local same-origin SSR `fetch("/xrpc/...")`
  calls (used by both this page and the pre-existing packs page) fail
  outright without `ORIGIN`/`PORT` env vars set — documented as hatk gotcha
  #7 in CLAUDE.md and fixed in `.claude/launch.json` for local preview
  testing. Confirmed this does NOT affect production: deployed and curled
  `/gallery` live, which does the identical same-origin `fetch("/xrpc/...")`
  pattern, and it correctly rendered the real (empty) trending state rather
  than erroring — so whatever Railway's env provides, it resolves fine
  there. By extension the pre-existing packs page (same fetch pattern) is
  also fine in production; this was local-only friction.
  OpenGraph cards for pack embeds — **done**: `server/og/pack.ts` renders a real satori image
  (icon/emoji, name, description, item count, creator handle) at
  `/og/packs/:handle/:rkey`, verified end-to-end (200 OK, real 1200x630 PNG
  with actual pack content, confirmed via `file`). hatk's built-in
  `publicDir`/`defineRenderer` auto meta-tag injection turned out to be
  **unwired for this project** — it requires a `public/index.html` with a
  `<!--ssr-outlet-->` placeholder, but this app builds via
  `@sveltejs/adapter-node` (`build/`, SvelteKit's own template/placeholders)
  and has no custom renderer registered; confirmed live that moji.blue's
  homepage currently has zero `og:*` tags anywhere, a pre-existing gap.
  Fixed at the actual rendering layer instead: standard SvelteKit
  `<svelte:head>` meta tags in `app/routes/packs/[handle]/[rkey]/+page.svelte`
  point `og:image`/`twitter:image` at the working OG endpoint, using pack
  data the page loader already fetches — no new round-trip. Verified with a
  real seeded pack row + rebuilt SSR bundle (`vp build`) + live curl: the
  page HTML actually contains the correct `og:title`/`og:description`/
  `og:image`/`twitter:*` tags. Note for local testing: booting `hatk start`
  bare and curling the pack page fails the loader's same-origin
  `fetch("/xrpc/...")` call with a raw `TypeError: fetch failed` — setting
  `ORIGIN`/`PORT` env vars (e.g. `ORIGIN=http://localhost:3000 PORT=3000`)
  fixes it locally, so SvelteKit's server-side fetch needs an explicit origin
  to self-resolve in this setup — confirmed pre-existing local-only friction,
  NOT a production issue: the trending-stats work below deployed a second
  page (`/gallery`) using this identical fetch pattern, and it rendered
  correctly live without any ORIGIN/PORT configuration on Railway's side.
  Deployed to production 2026-07-08 (Railway build + healthcheck both
  succeeded, `/_health` returns ok); could NOT do a final live end-to-end
  check against a real pack, though — there's no public pack-discovery
  endpoint (`getActorPacks`/`getPacks`/`getPack` all require already knowing
  an actor or URI) and I don't have app-password credentials to create a
  test pack. Whoever shares a real pack link next
  should sanity-check `/og/packs/:handle/:rkey` renders and unfurls
  correctly (e.g. paste the pack URL into a Bluesky/Discord composer).
- **Verified/first-party sets — attribution done**: `blue.moji.collection.item#itemView`
  now carries `copyOf` (the record's own field, just projected into the
  view) and a server-resolved `originalCreator` ({did, handle}) —
  `resolveOriginalCreator()` in `_pack-views.ts` walks the `copyOf` chain
  back to its root (bounded to 10 hops) rather than just exposing the
  immediate, possibly-also-a-copy source, so a pack showing someone's copy
  of a copy still credits the actual original artist. Wired into all four
  itemView call sites (`getItem`, `listCollection`, `searchItems`,
  `getPack`), consolidated behind one shared `itemView()` helper (was four
  near-duplicate inline object literals before this pass). Surfaced in the
  pack page UI as a "by @handle" credit line under each copied item.
  Verified live: seeded a real 2-hop chain (original → copy → copy-of-copy)
  and confirmed all four endpoints resolve to the true root creator, a
  broken chain (copyOf pointing at a deleted item) correctly omits
  `originalCreator` rather than erroring, and the pack page renders the
  credit correctly in a real browser. Not done: artists _signing_ packs, or
  tip-jar links — those need actual design work, not just this attribution
  plumbing, and weren't attempted this pass. Deliberately did NOT wire this
  into the personal collection page (`/collection`) — that page reads
  directly from the viewer's own PDS (`com.atproto.repo.listRecords`) for
  freshness, bypassing the AppView entirely, so `originalCreator` isn't
  available there without adding a resolution round-trip; the pack page and
  search (the actual public discovery surfaces) already carry it.
- **Sticker composer — pick-and-attach done**: new `/compose` page (auth-
  gated, redirects signed-out visitors to `/`) lets a signed-in user write
  post text, pick one of their `stickerFormats`-capable items, and post it
  as an `app.bsky.feed.post` with a `blue.moji.embed.sticker` embed via
  `dev.hatk.createRecord`, redirecting to the new post's page on success.
  Required vendoring the real `app.bsky.feed.post` lexicon (fetched from
  the canonical `bluesky-social/atproto` GitHub repo — it wasn't already
  present, only `postgate`/`threadgate` were) since hatk's PDS-proxy write
  path validates records against vendored lexicons; deliberately did NOT
  add it to `hatk.config.ts`'s `collections`/`signalCollections` allowlists
  (see gotcha #1 — moji.blue writes posts, it doesn't need to index them).
  Added a new `repo:app.bsky.feed.post` OAuth scope to both the `scopes`
  array and every client's `scope` string. Confirmed the post's `embed`
  union in the real lexicon has no `"closed": true`, so an unlisted
  `$type` like `blue.moji.embed.sticker` validates fine as long as its own
  vendored lexicon is structurally valid — checked this directly by
  invoking `@bigmoves/lexicon`'s real `validateRecord` against a sample
  record instead of assuming it. Verified: `vp check`/`svelte-check` clean,
  a clean boot log shows `app.bsky.feed.post` correctly absent from
  `Collections:` (not indexed), and the compose page's auth redirect works
  in a real browser (signed-out visitors bounce to `/`). **Not verified**:
  the actual PDS write / end-to-end "does a real post appear on Bluesky"
  path — that needs either Docker (for `hatk seed`'s local test PDS, which
  wasn't running this session) or a real account's OAuth session, neither
  of which was available; the record-shape validation above is real but is
  not a substitute for an actual post round-trip. Whoever tests this live
  should also check that an _existing_ signed-in session doesn't need to
  re-auth for the new scope (OAuth scope changes typically require
  re-consent). `recordWithMedia`-style composition (sticker + quote post,
  RFC 0003's open question) not attempted.
- **Animated pipeline — transcode done**: checked imgproxy#1222 live
  (`gh issue view`) — still open upstream, no maintainer commitment to
  APNG animation support. But the actual serving path in this codebase
  (`/img/{did}/{cid}`) turned out to be a pure PDS-blob passthrough that
  never used imgproxy at all, and the upload flow was uploading the raw,
  **unresized** original APNG bytes verbatim into `apng_128` (not actually
  128px, whatever the source file's dimensions were). So the real fix
  isn't blocked by imgproxy: added `blue.moji.collection.transcodeAnimation`
  (`server/transcode-animation.ts`), a pure utility procedure (no PDS/
  record writes) that shells out to `ffmpeg` to transcode an uploaded
  animated source into properly-sized 128×128 and 512×512 animated WebP
  (`libwebp_anim` encoder) — auth-gated, base64-in/base64-out JSON (custom
  procedures on this AppView always get JSON-parsed bodies; only the
  built-in `dev.hatk.uploadBlob` gets raw-body handling, discovered while
  designing this), with a decoded-size cap and an ffmpeg timeout. Wired
  into the upload page: APNG uploads now transcode to `webp_128`/`webp_512`
  instead of storing raw `apng_128`, with a catch-and-fallback to the old
  raw-upload behaviour if the transcode call fails for any reason. Added
  `ffmpeg` to the Dockerfile.

  Verified for real, not assumed: spun up Docker (wasn't running earlier
  this session) and ran the exact `node:25-slim` + `apt-get install ffmpeg`
  combination the Dockerfile uses — confirmed Debian's ffmpeg package
  actually ships `libwebp`/`libwebp_anim` encoders (my local Homebrew
  ffmpeg build notably does NOT include libwebp encoding at all, which
  would have been a false-negative if I'd only tested locally). Generated a
  real 10-frame test APNG with ffmpeg itself, ran the exact `execFile` call
  from `server/transcode-animation.ts` (not just a hand-typed shell
  command) inside that container, and validated the output with `webpinfo`:
  both 128×128 and 512×512 outputs are structurally valid animated WebP
  (`VP8X`/`ANIM`/10×`ANMF` chunks, loop count 0) — `libwebp_anim` produced
  a smaller file than plain `libwebp` via inter-frame diffing, so switched
  to it. Also verified the failure path: feeding garbage bytes through the
  same code produces a clean ffmpeg error (caught as `InvalidRequestError`),
  not a hang or crash. Confirmed the procedure registers in a real boot's
  `XRPC:` list and correctly rejects unauthenticated requests
  (`{"error":"Authentication required"}`). **Not verified**: the upload
  page's browser-side integration (base64 encode/decode, the `callXrpc`
  round-trip, the fallback-on-failure UI path) — that needs the same
  Docker/credentials-gated login flow already flagged as unavailable this
  session for the sticker composer and packs-page checks. Lottie sandboxing
  guidance for renderers not attempted.

- **Interop bridges — Signal-style export done, import deferred**: scoped
  down deliberately (asked first rather than guessing) — Slack/Discord have
  no first-party bulk-export format at all (no common spec to import
  against), and building real importers for three different platforms plus
  an export in one pass wasn't realistic, so this pass is export-only.

  New `GET /packs/:handle/:rkey/export` (`app/routes/packs/[handle]/[rkey]/
export/+server.ts`) downloads a portable bundle for sticker-capable pack
  items: `manifest.proto` (Signal's **real** `StickerPack` protobuf schema
  — fetched from `signalapp/Signal-Desktop`'s `sticker-creator/protos/
Stickers.proto` via `gh api`, not guessed), a `manifest.json` mirror, one
  `N.webp` per item plus `cover.webp`, and a `README.txt` explaining this
  is a portable bundle for use with a Signal-compatible packaging tool
  (e.g. `sticker-convert`) — moji.blue has no Signal API credentials to
  publish a pack directly. Non-WebP sticker formats are converted via the
  `ffmpeg` now already in the Docker image (Phase 4.7). "Export as Signal
  stickers" button on the pack page, shown only when the pack has at least
  one sticker-capable item.

  The protobuf encoder (`app/lib/signal-manifest.ts`) is hand-rolled rather
  than a new dependency — proto3 wire format for four scalar/nested-message
  fields is a few dozen lines — but **verified against the real spec, not
  assumed correct**: installed `protoc` and round-tripped encoded output
  through `protoc --decode=StickerPack`, confirming byte-exact structural
  correctness against Signal's own schema. Added `yazl` (small, focused ZIP
  writer) for the archive itself; verified the full pipeline for real by
  building an actual zip with a real ffmpeg-converted WebP image, extracting
  it with `unzip`, and re-verifying `manifest.proto` decoded correctly from
  the extracted file (not just testing the encoder in isolation). Verified
  the route's error paths against real seeded data: a pack with no
  sticker-capable items → clean 400, a nonexistent pack → clean 404. Found
  and fixed a real bug while verifying in a browser: the export `<a>` tag
  was being intercepted by SvelteKit's client router (which doesn't know
  how to navigate to a raw `+server.ts` binary download) and threw a
  console error instead of downloading — fixed with `data-sveltekit-reload`
  to force a real browser navigation. **Not verified**: the full happy path
  with real PDS-backed sticker blobs (no sticker-capable item with a real,
  resolvable blob was available this session — the one real relay-indexed
  item in the local dev DB is inline-only) — the 502 "couldn't fetch any
  sticker images" path was confirmed instead, and every other stage
  (protobuf, zip, ffmpeg conversion) was verified independently for real.
  Import from Slack/Discord/Mastodon not attempted this pass.

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
