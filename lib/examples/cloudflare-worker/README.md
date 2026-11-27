# Bluemoji image proxy for Cloudflare Workers

Serves `/img/{did}/{cid}` from your own domain, so a client of your AppView
loads emoji pixels from you and not from moji.blue. It resolves the owner's PDS
from their DID document, fetches the blob, checks the bytes hash to the CID,
refuses SVG and other active documents, and answers with a sandboxing CSP and
immutable caching.

1. `npm i @aendra/bluemoji` and copy `worker.ts` and `wrangler.toml` into a project.
2. Set `APPVIEW_URL` to an AppView that answers `blue.moji.collection.checkBlob`
   (moji.blue does). **Without it the Worker serves any blob from any repo.**
3. `npx wrangler deploy`, then route `yourdomain/img/*` to it.

## What the core guarantees, and what it leaves to the platform

The core refuses non-https and non-443 upstreams, IP literals, and private or
internal hostnames, re-checks every redirect hop, and caps the body while it
streams. It checks hostnames **by name**. It cannot see what a public-looking
name resolves to. Workers cannot connect to private addresses inside Cloudflare's
network, but check that for your own platform before relying on it. On Node,
pass `fetchBlob` and `resolvePds` hooks that pin addresses at connect time, as
moji.blue does (`app/lib/server/blob-proxy.ts`).

## Takedowns

A cache hit skips `authorize`, so a takedown reaches a cached blob only when the
entry expires or is purged. Purge by URL when an account is taken down.
