# Bluemoji (moji.blue)

Custom emoji standard for ATProto: shareable emoji (inline via richtext
facets), stickers (full-size post embeds), packs (curated shareable groups),
and custom-emoji reactions. This repo is the whole project: lexicons, the
moji.blue AppView (hatk framework), and the `@aendra/bluemoji` client library.

**Read [ROADMAP.md](ROADMAP.md) before planning any feature work** — it holds
the prioritised backlog, the remaining lexicon-hygiene items, and the
ideation pipeline. Design rationale lives in `rfcs/` (0001 core, 0002 packs,
0003 stickers, 0004 reactions, 0005 internationalised aliases).

## Repo map

- `lexicons/blue/moji/**` — the standard. Source of truth for everything.
  `lexicons/app/bsky/**` and `com/atproto/**` are vendored Bluesky/ATProto
  lexicons (do not edit except to re-vendor).
- `server/` — hatk XRPC handlers (`get-pack.ts`, `get-actor-packs.ts`,
  `get-packs.ts`, `get-reactions.ts`, `put-item.ts`) and hooks
  (`on-login.ts`). Files starting with `_` are scanner-ignored shared
  helpers (`_pack-views.ts`).
- `app/` — SvelteKit frontend. Routes: `/` (login), `/collection`, `/upload`,
  `/packs`, `/packs/[handle]/[rkey]`, `/profile/[handle]/post/[rkey]`
  (post renderer with facets, sticker embed, reaction bar), and
  `/img/[did]/[cid]` (+server.ts blob proxy).
- `app/lib/alias.ts` — canonical RFC 0005 implementation (alias
  canonicalisation + Punycode rkey encoding). **Duplicated** in
  `lib/src/util/alias.ts` for the published package; keep the two in sync.
- `lib/` — `@aendra/bluemoji` npm workspace: generated lexicon client
  (`lib/src/client/`, via lex-cli codegen), `BluemojiRichText` + facet
  detection, renderers, React/RN/web components.
- `hatk.config.ts` — relay, DB, OAuth scopes, and the **collections
  allowlist** (see gotcha #1 below).
- `hatk.generated.ts` / `hatk.generated.client.ts` — regenerated artifacts;
  never hand-edit.

## Core design decisions (do not casually revisit)

- **Alias ↔ rkey (RFC 0005)**: rkey = canonical alias if it matches
  `^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$`, else `xn--` + RFC 3492 Punycode of
  the NFC+lowercase+NFC canonical form. `name` fields always hold the
  colon-wrapped _decoded_ alias. Every rkey derivation MUST go through
  `aliasToRkey()` — never `name.replace(/:/g, "")`.
- **Emoji vs sticker**: one record type; an item with `stickerFormats`
  (512px renditions) is sticker-capable, `formats` (128px) alone is
  inline-only. No `kind` enum.
- **Cross-repo blob references are impossible** in ATProto, so facets,
  sticker embeds, and reaction `emojiRef`s carry **CID strings + a did**
  (URL construction without round-trips), never `blob` refs. Blobs only
  appear in `blue.moji.collection.item` itself.
- **Copying is duplication by design** (`copyOf` records provenance): fetch
  blob bytes → re-upload to the copier's repo → write item. This is what
  makes packs fault-resistant to source-account deletion.
- **All image URLs go through `/img/{did}/{cid}`** (same-origin, immutable
  cache headers) — never link PDS `getBlob` URLs directly from the app.

## hatk gotchas (each of these cost real debugging time)

1. **Set `collections:` in hatk.config.ts or hatk indexes every record
   lexicon in `lexicons/`** — including vendored postgate/threadgate — and
   auto-backfills the full repo of every DID on the network that writes one.
   This OOM'd production twice. The allowlist + `backfill.signalCollections`
   must both list exactly the `blue.moji.*` record types.
2. **`ctx.getRecords`/`ctx.lookup` rows return union sub-objects with blob
   refs serialized as JSON strings and absent keys as `null`.** Normalise
   before returning views — see `normalizeFormats()` in
   `server/_pack-views.ts`. Booleans come back as 0/1.
3. `ctx.filterTakendownDids(dids)` returns the set of **taken-down** DIDs
   (filter _out_ members), not the survivors.
4. The `server/` scanner skips `_`-prefixed files; that's the only way to
   have shared helpers there. Server files can import from `app/lib/` via
   relative path with explicit `.ts` extension (put-item.ts does).
5. After editing lexicons: `./node_modules/.bin/hatk generate types`, and
   hatk auto-migrates SQLite columns on next boot. For the npm lib:
   `cd lib && ../node_modules/.bin/lex gen-api ./src/client
../lexicons/app/bsky/*/* ../lexicons/com/atproto/*/*
../lexicons/blue/moji/*/* --yes`.
6. XRPC handler param/ctx surface: see `@hatk/hatk/dist/xrpc.d.ts`
   (`XrpcContext`) — includes `packCursor`/`unpackCursor` for keyset
   pagination, `blobUrl`, `search`, `exists`, PDS-proxied record writes.
7. SSR pages can call our own XRPC same-origin with SvelteKit's relative
   `fetch("/xrpc/...")` — cookies forward, viewer state works.

## Verification workflow

- `vp check` (0 errors expected; warnings in generated lib code are normal),
  `vp check --fix` to format. It also reformats vendored lexicon JSON —
  harmless churn.
- `npx svelte-check` — **the `Cannot find module '$hatk/client' / '$lib/…'`
  errors are false positives** (aliases exist only under hatk's vite plugin
  at runtime). Real errors are anything else.
- Alias spec tests: `npx tsx lib/src/util/alias.test.ts` (6 tests; known IDN
  vectors). `lib/src/facet/BluemojiRichText.test.ts` fails offline — it
  resolves a live DID over the network; pre-existing, not a regression.
- `vp test` at root finds no tests (expected; tests live in `lib/`).
- Local smoke boot without the docker PDS:
  `timeout 12 ./node_modules/.bin/hatk start` — check the `XRPC:` line lists
  all five handlers; relay connection errors are expected locally.
- Full local dev (`vp dev`) needs Docker for the local PDS/PLC on ports
  2582/2583; `hatk seed` creates alice.test/bob.test.
- Endpoint testing pattern: seed rows directly into `data/hatk.db` with
  sqlite3, boot, curl `localhost:3000/xrpc/...`, then delete the rows.

## Deployment (Railway + Cloudflare)

- Railway CLI is authed. Project **Bluemoji**, service **moji.blue**, volume
  `moji-blue-volume` at `/data` (SQLite lives there and survives deploys).
- Deploy: `railway up --detach` from repo root (Dockerfile build, ~2 min).
  Status: `railway status`; logs: `railway logs` / `railway logs --build`.
- Env: `RAILWAY_PUBLIC_DOMAIN=moji.blue` (overrides the injected var; OAuth
  issuer + client metadata derive from it), `NODE_OPTIONS=--max-old-space-
size=4096` (backfill CAR imports spike; V8's default 2GB cap crashed prod).
- moji.blue DNS is on Cloudflare, proxied, SSL mode **Full** (Flexible
  causes an infinite 301 loop with Railway). Pending: a Cache Rule for
  `/img/*` (see ROADMAP Phase 2).
- Prod health checks: `https://moji.blue/_health`,
  `/xrpc/blue.moji.packs.getPacks?uris=…`, `/oauth-client-metadata.json`
  (issuer must be moji.blue), `/img/{did}/{cid}` (expect `immutable` +
  etag; 304 on `If-None-Match`).
- After lexicon changes that affect OAuth scopes, update **both** the
  `scopes` array and every client's `scope` string in `hatk.config.ts`.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->
