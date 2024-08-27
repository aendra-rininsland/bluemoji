- Start Date: 2024-08-18

# Summary

Custom, user-shareable animated emoji on Bluesky and other ATProto services.

# Basic example

Users upload `blue.moji.collection.item` records
[[schema]][schema_collection_item] containing image assets, named with a short
alias that also occupies the record rkey.

Users are then able to reference records from their own repos with those
aliases, which are then faceted by `RichText` from the `@atproto/api` module. A
reference implementation of that is [here][richtext_impl].

# Motivation

The ability to use custom emoji adds a degree of previously unrealised
expression on the platform and standardises functionality that risks being
developed independently in an incompatible fashion by non-Bluesky AppViews. The
Bluemoji project seeks to create a consensus for delivering custom emoji in a
way that is accessible, able to be moderated, performant, fault-resistant,
decentralised and independent of any one AppView's implementation, in descending
order of priorities.

# Detailed design

## Terminology

- _Bluemoji_, _Bluemoji Item_, _Bluemoji Record_: This a record in the
  [`blue.moji.collection.item`][schema_collection_item] collection representing
  a custom emoji glyph.

- _Bluemoji Alias_, _alias_, _colon-wrapped alias_, _dotted-alias_: This is how
  the Bluemoji is named, reflected in the record's `rkey`. When detected by the
  Bluemoji Facet (see below), these are decorated with metadata allowing clients
  to render the Bluemoji. The record name itself must match `\b[a-z0-9-]+\b` and
  does not include `:` characters; when written prior to faceting, it is written
  wrapped in `:` character (e.g., `:alias-name:`), hereafter referred to as a
  "colon-wrapped alias" or simply "dotted-alias".

- _Bluemoji Collection_: The `blue.moji.collection.item` collection; all of an
  individual user's collected Bluemoji. Not to be confused with the generic
  ATProto term "collection".

- _Bluemoji Facet_: The `app.bsky.richtext.facet` facet feature available at
  [`blue.moji.richtext.facet`][schema_richtext_facet], which enables text to be
  annotated as containing a reference to a Bluemoji item.

- _Bluemoji Pack_: A `blue.moji.pack.record` record, which is a user's curation
  of specific Bluemoji into a shareable pack, intended to function similarly to
  how Starter Packs work.

- _Fallback Text_, _Fallback Character_: Implementers are expected to use the
  colon-wrapped alias (`:alias:`) as fallback text for the facet but there's no
  way to enforce this. To that end, it is intended that if implementers do not
  wish to use the full colon-wrapped alias as fallback text, they should use
  U+25CC (`◌`, "Dotted Circle") as a replacement string for the colon-wrapped
  alias during faceting. This, however, is strongly advised **against** as it
  deprives unsupporting clients of any usage context or ability to provide
  accessibility affordances to users.

Users are supplied an interface to select an image asset (at time of writing,
this is limited to static PNG, animated PNG and Lottie animations, though
support for WebP and GIF is also being considered). The uploading app then
requests a Bluemoji alias and alt text for screen readers, before resizing the
image and either uploading as a `Blob` (static PNG, GIF, WebP) or embedding in
the record as a `Bytes` object (animated PNG; Lottie). The uploading app may
also give the user the option to label a Bluemoji using any of the existing
first-party Bluesky content moderation self-labelling options, which in turn
results in the record's `adultOnly` boolean being toggled.

Users can then type the colon-wrapped alias in their message bodies, which will
be detected by the facet and embellished with metadata from their repos. Clients
can then use that metadata to render the Bluemoji record in a variety of formats
(currently, raster assets are expected to be resized to 128x128 pixels, with
animated PNGs and Lottie files expected to be less than 64kb. There is presently
no way of enforcing this, however; see "Payload Size" under "Drawbacks" below).

### Formats

At launch, the current supported formats are:

- 128x128px static `image/png`, stored as `Blob`.
- 128x128px animated `image/png`, stored as `Bytes`.
- Vector Lottie (dotLottie and Lottie JSON) files, stored as both `Bytes` and
  `Blob` (`formats.lottie` and `formats.original` record attributes,
  respectively).

`Blob` assets in static `image/png` are accessible via the Bluesky CDN so the
record without making an additional `com.atproto.repo.getRecord` request. The
CDN resource for blobs isn't specified so it's possible that animated PNG (as
well as animated WebP and GIF) blobs can be served through a customised ImgProxy
implementation (unfortunately, at time of writing, animated PNG conversion
results in frames being reprocessed to GIF with unacceptible quality loss, so
it's not worthwhile to host an ImgProxy implementation for animated files. This
may change if a lossless route to easily convert APNG to WebP is found, however,
or if ImgProxy adds support for APNG animations. See
[imgproxy#1222][imgproxy_1222]).

# Drawbacks

- **Moderation concerns:** Bluemoji leverages the `Bytes` and `Blob` types,
  which are ingested into Bluesky's content moderation tooling regardless of the
  parent record's type. This enables Bluemoji to be moderated like other images
  on the platform, though Lottie assets stored as `Bytes` may pose initial
  moderation challenges (to wit: Ozone would need to be enhanced to be able to
  moderate Bluemoji assets successfully). How ATProto labels are leveraged for
  emoji moderation remains an open question; it is expected that clients will
  provide functionality to users similar to that of posts, allowing them to hide
  or warn about emoji as per their app moderation settings. Additionally, users
  are able to themselves flag their emoji as having sensitive content by
  uploading with a self-label, similar to how posts can be self-labelled.

- **Payload size:** While reasonable limits have been suggested for Bluemoji
  assets, it's up to the implementers to follow them. Nothing is preventing a
  client from uploading a blob larger than the recommended limits, though it's
  suggested that clients stop streaming data at the ~64kb mark to discourage
  this behaviour. Currently, Lottie and PNG are stored as `Bytes` to prevent an
  additional round-trip to the CDN for the asset; it's possible this will cause
  headaches due to expanding the size of `app.bsky.feed.post` records as a
  result, so may need to be revisited.

- **Copyright concerns:** While I haven't heard of copyright holders targeting
  platforms with custom emoji with legal requests, it's not unreasonable to
  suspect that they will at some point. These would have to be handled by
  individual PDSes given that's where the emoji asset data would reside at rest.

- **Accessibility concerns:** The colon-wrapped alias provides a slight amount
  of contextual information so it has been recommended as the fallback text, but
  there's no way of enforcing that given how ATProto facets work. A suggested
  fallback character (`◌`) has been provided to provide guide-rails for an
  approach that may become popular as more clients begin to support Bluemoji in
  the future, especially given that the facet contains more accessibility
  information than the colon-wrapped alias provides.

# Alternatives

One alternative might be that individual AppViews begin constructing their own
unique emoji systems, which would likely be incompatible with other parts of the
ecosystem. Proposing an open standard means ATProto implementers have best
practices to draw from in terms of accessibility, moderation and performance.

# Adoption strategy

A hacked version of `@atproto/api`'s `RichText` code has been provided as
`BluemojiRichText`; additionally, a "register" version exists that patches the
pre-existing `RichText` class so existing implementations don't need to rewrite
rendering code to use the new `BluemojiRichText` class.

The [@moji.blue Bluesky user][moji.blue] is intended to provide a number of
useful features, such as alerting whenever a new Bluemoji record has been
created and providing a link to let users copy new record to their repos.
Several custom feeds showing people using Bluemoji are also planned. It may
eventually provide usage stats as well ("Weekly Top Bluemoji", "Weekly Top Emoji
Copies", et cetera).

Additionally, Bluemoji Packs are intended to let users copy curated groupings of
Bluemoji provided by other users, similar to how Starter Packs let users follow
individual or every user from a curated list. This is hoped to give users the
ability to quickly and easily begin using Bluemoji without having to
painstakingly build a collection from uploading or copying individual records.

# Unresolved questions

- What is a reasonable maximum size for `Bytes`? Is 64kb too big?
- Using `Bytes` has benefit because it removes a single round-trip to the CDN;
  is this of sufficient benefit to justify using an untyped format for these
  objects?
- Is it possible to render an APNG to WebP lossly in NodeJS? If so, this would
  mean `Blob` could be used for serving APNG from CDN, which would be the best
  possible outcome for that format.
- What moderation concerns remain about `Bytes` images?
- Is the colon-wrapped alias ultimately the best thing to use as a fallback?
  Feedback from accessility practitioners would be most appreciated.

# Prior art

- Mastodon’s per-instance emoji system has had a great deal of influence on this
  project and indeed this was what it’s meant to emulate most.
- Slack’s workplace-level custom emojis are also a significant influence.
- Discord’s per-user server-based emoji collections are also an inspiration.
- Telegram's Lottie-based stickers inspired the use of that here; many thanks to
  [@chymerajade.bsky.social][chymerajade] for the suggestion! 💚

[schema_collection_item]: ../schema/blue.moji/collection/item.json
[schema_richtext_facet]: ../schema/blue.moji/richtext/facet.json
[richtext_impl]: ../lib/src//facet/BluemojiRichText.ts
[imgproxy_1222]: https://github.com/imgproxy/imgproxy/issues/1222
[chymerajade]: https://bsky.app/profile/chymerajade.bsky.social
[moji.blue]: https://bsky.app/profile/moji.blue
