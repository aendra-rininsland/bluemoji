# Rendering Bluemoji facets in ~20 lines

This is for developers building an ATProto client (Bluesky-compatible app,
alternate AppView, bot, whatever) who want to render Bluemoji **without**
adopting the `@aendra/bluemoji` npm package or running the moji.blue AppView.
Bluemoji facets carry everything needed to render inline, so this is
deliberately the lowest-friction way to adopt the standard — you're already
walking `post.facets` for mentions and links; this is one more feature type
in that same loop.

If you'd rather use a maintained library instead of the snippet below, skip
to [Prefer a library?](#prefer-a-library) at the bottom.

## The shape

A Bluemoji is just another feature on an `app.bsky.richtext.facet`, sitting
alongside `app.bsky.richtext.facet#mention` and `#link`:

```json
{
  "index": { "byteStart": 41, "byteEnd": 53 },
  "features": [
    {
      "$type": "blue.moji.richtext.facet",
      "did": "did:plc:abc123",
      "name": ":blobcat:",
      "alt": "A round cat, vibrating",
      "formats": {
        "$type": "blue.moji.richtext.facet#formats_v1",
        "png_128": "bafkreicid..."
      }
    }
  ]
}
```

Two fields matter for rendering: `did` (whose repo the emoji's blob lives in)
and `formats` (CIDs of the renditions, keyed by format — `png_128`,
`webp_128`, `gif_128`, `apng_128`, `lottie`). Combine `did` + a format's CID
to build a blob URL with **zero extra round-trips** — no need to fetch the
source record first.

## The code

```ts
async function renderBluemoji(
  text: string,
  facets: { index: { byteStart: number; byteEnd: number }; features: any[] }[],
  resolvePds: (did: string) => Promise<string>, // you already have this
) {
  const bytes = new TextEncoder().encode(text);
  const html: string[] = [];
  let pos = 0;

  for (const facet of [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart)) {
    const moji = facet.features.find((f) => f.$type === "blue.moji.richtext.facet");
    if (!moji) continue;

    html.push(escapeHtml(new TextDecoder().decode(bytes.slice(pos, facet.index.byteStart))));

    const cid = moji.formats.png_128 ?? moji.formats.webp_128 ?? moji.formats.gif_128;
    const pds = await resolvePds(moji.did);
    const q = new URLSearchParams({ did: moji.did, cid });
    html.push(
      cid
        ? `<img src="${pds}/xrpc/com.atproto.sync.getBlob?${q}" ` +
            `alt="${escapeHtml(moji.alt ?? moji.name)}" style="height:1.2em;vertical-align:middle">`
        : escapeHtml(moji.name), // apng_128/lottie in the deprecated formats_v0 union
    ); //  are booleans, not CIDs — fall back to the colon-wrapped name as text
    pos = facet.index.byteEnd;
  }

  html.push(escapeHtml(new TextDecoder().decode(bytes.slice(pos))));
  return html.join("");
}
```

`resolvePds` is the one thing left as a black box — every ATProto client
already needs "DID → PDS endpoint" for blobs in general (avatars, post
images), so this isn't Bluemoji-specific. If you don't have one yet: resolve
the DID document (`https://plc.directory/{did}` for `did:plc:*`, or
`https://{domain}/.well-known/did.json` for `did:web:*`) and read the
`AtprotoPersonalDataServer` service's `serviceEndpoint`.

`escapeHtml` is your existing HTML-escaping utility — `moji.name`/`moji.alt`
are user-controlled strings, escape them like any other user text.

That's it. Detect the feature, build a URL from `did` + a CID, fall back to
the colon-wrapped name as plain text when you can't. `:blobcat:` in a post
becomes an inline `<img>`, and anything you don't recognise degrades to
readable text — same failure mode as an unsupported link card.

## Before you ship: verify, don't trust

The snippet above renders whatever the post claims. That's fine for a
prototype, but `did`, `formats`, `alt`, `adultOnly`, and `labels` on a
Bluemoji facet are **self-attested by the poster** — nothing validates them
against reality when the post is written. A malicious client could attach
someone else's `did` to a CID that isn't even an emoji, or omit `adultOnly`
to dodge a content warning the real emoji carries.

The fix is one extra lookup: resolve `blue.moji.collection.item` at
`at://{did}/blue.moji.collection.item/{rkey}`, where `rkey` is the canonical
alias itself for plain ASCII names, or its RFC 3492 Punycode encoding for
internationalised ones — see [RFC 0005](rfcs/0005-internationalised-aliases.md)
for the exact derivation — and render _that_ record's `formats`/`adultOnly`,
not the facet's. If you're running against an AppView that indexes the
firehose (rather than talking to PDSes directly), that lookup is a local
index hit, not a network round-trip — see `blue.moji.collection.getItem` and
`server/get-item.ts` in this repo for a working implementation, and RFC
0001's self-attestation amendment for the full reasoning. Treat unverified
facets the way you'd treat an unverified embed: fine to render, not fine to
make moderation decisions from.

## What else is easy from here

- **Reactions** are the next-lowest-friction addition: `blue.moji.feed.getReactions?uri={postUri}`
  against an AppView returns aggregated counts and hydrated emoji images —
  read-only support is a fetch and a loop, no facet parsing or composer
  integration required.
- **Stickers** (`blue.moji.embed.sticker` on `post.embed`) render the same
  way as facets — `did` + a format CID — just full-size instead of inline,
  and worth the same verification caveat.
- **Packs** (`blue.moji.packs.getPack`) are how users discover and copy
  curated groups of Bluemoji; nothing to render inline, just a nice
  "browse and copy" surface if you have room for one.

## Prefer a library?

`@aendra/bluemoji` ships `BluemojiRichText` (extends `@atproto/api`'s
`RichText` to detect Bluemoji facets when composing) and a `render()` helper,
plus generated types for every `blue.moji.*` lexicon including stickers and
reactions:

```
npm install @aendra/bluemoji
```

```ts
import { BluemojiRichText } from "@aendra/bluemoji/facet";
```

See [lib/README.md](lib/README.md) for the composer-side API.
