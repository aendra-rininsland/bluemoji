- Start Date: 2026-07-07
- RFC PR:
- Bluemoji Issue:

# Summary

Distinguish inline **emoji** from full-sized **stickers**, and define a post
embed (`blue.moji.embed.sticker`) for sharing a Bluemoji at full size as a post
attachment.

# Basic example

A user uploads a Bluemoji. In addition to the 128px inline renditions stored
under `formats`, the client generates full-size (512px-class) renditions stored
under a new optional `stickerFormats` field on `blue.moji.collection.item`.

When composing a post, the user can attach the sticker. The client writes an
`app.bsky.feed.post` record whose `embed` is a `blue.moji.embed.sticker`
object, in exactly the same position an `app.bsky.embed.external` card would
occupy.

```json
{
  "$type": "app.bsky.feed.post",
  "text": "look at this cat",
  "embed": {
    "$type": "blue.moji.embed.sticker",
    "sticker": {
      "record": {
        "uri": "at://did:plc:abc/blue.moji.collection.item/blobcat",
        "cid": "bafy..."
      },
      "did": "did:plc:abc",
      "name": ":blobcat:",
      "alt": "A round cat, vibrating",
      "aspectRatio": { "width": 1, "height": 1 },
      "formats": {
        "$type": "blue.moji.embed.sticker#formats_v0",
        "png_512": "bafk..."
      }
    }
  },
  "createdAt": "2026-07-07T00:00:00.000Z"
}
```

# Motivation

Bluemoji so far focuses on the small inline context: 128px glyphs woven into
text via `blue.moji.richtext.facet`. But the same assets have a second natural
context — sent full-size as the _payload_ of a message, the way Telegram,
Signal and LINE stickers work. These are different products with different
constraints:

|                | Emoji                    | Sticker                 |
| -------------- | ------------------------ | ----------------------- |
| Placement      | inline with text (facet) | post attachment (embed) |
| Render size    | ~1.5em                   | up to 512px             |
| Count per post | many                     | one                     |
| Asset budget   | small (≤128kb)           | larger (≤512kb)         |

Conflating them means either shipping blurry, upscaled 128px images as
"stickers" or bloating every inline emoji with full-size assets. Keeping one
record type but splitting the _renditions_ keeps a single collection, a single
alias namespace, and a single moderation surface.

# Detailed design

## Distinguishing emoji from stickers

`blue.moji.collection.item` gains an optional `stickerFormats` union
(`#stickerFormats_v0`), holding full-size blob renditions (`png_512`,
`webp_512`, `gif_512`, `apng_512`, `lottie`) with a 512kb-per-blob budget.

- An item **with only `formats`** is an inline emoji.
- An item **with `stickerFormats`** is additionally usable as a sticker.

There is deliberately no `kind` enum: capability is expressed by the presence
of renditions, so a record can be both, and older records remain valid emoji
without migration.

## The embed

`blue.moji.embed.sticker` mirrors `app.bsky.embed.external`'s shape: a `main`
object def carrying a single `sticker` object, plus `view`/`viewSticker` defs
for AppView hydration (fully-qualified `fullsize`/`thumb` URLs).

Like `blue.moji.richtext.facet` — and unlike Bluesky's own media embeds — the
embed carries **CIDs as strings, not blob refs**. Blobs cannot be referenced
across repos: a PDS validates that any `blob` in a record was uploaded by that
repo's owner, and a sticker being posted usually lives in the poster's own repo
but _may_ be a copied/referenced asset. The `did` + CID pair is sufficient to
construct a getBlob/CDN URL with zero round-trips. The optional `record`
strongRef preserves provenance and gives moderation a stable subject.

`viewSticker` also exposes `labels`, so AppViews can propagate the source
item's self-labels (`adultOnly`, etc.) to every post that embeds it.

## Fallback behaviour

Clients that do not understand `blue.moji.embed.sticker` will simply not
render the embed — the post text still stands alone, which is the same
degradation mode as an unknown external embed. `name` doubles as fallback text
for clients that partially understand the embed.

# Drawbacks

- Another embed type third-party clients must adopt; until they do, sticker
  posts render as plain text. (Mitigated: the post is still legible.)
- Posts cannot combine `blue.moji.embed.sticker` with other embeds unless a
  future `recordWithMedia`-style union admits it.
- Full-size assets raise the moderation stakes relative to 128px glyphs; the
  self-label propagation via `viewSticker.labels` and the `record` strongRef
  are designed to keep Ozone-style tooling effective.

# Alternatives

- **A separate `blue.moji.sticker.item` collection.** Rejected: splits the
  alias namespace, doubles the pack/copy/moderation surface, and most stickers
  start life as emoji anyway.
- **Reusing `app.bsky.embed.images` with the full-size blob.** Rejected: only
  works when the blob is in the poster's repo, loses provenance, and gives
  clients no signal to render transparent/sticker-style (no card chrome).
- **Facet-only with a `size` hint.** Rejected: stickers are attachments, not
  text decorations; byte-range facets are the wrong tool.

# Adoption strategy

The moji.blue AppView renders the embed on post pages. `@aendra/bluemoji`
ships generated types for `blue.moji.embed.sticker` so third-party clients can
adopt with a type-safe API. The upload flow generates `png_512` renditions by
default so the sticker corpus grows without user effort.

# Unresolved questions

- Should animated sticker budgets differ from static (e.g. 512kb APNG is easy
  to exceed)?
- Is 512px the right canonical size, or should we define 512 _and_ 256?
- Should `app.bsky.embed.recordWithMedia`-style composition (sticker + quote
  post) be specified now or later?
