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
way that is accessible, able to be moderated, fault-resistant, decentralised and
independent of any one AppView's implementation, in descending order of
priority.

# Detailed design

## Terminology

- _Bluemoji_, _Bluemoji item_, _Bluemoji record_: This a record in the
  [`blue.moji.collection.item`][schema_collection_item] representing a custom
  emoji glyph

- _Bluemoji alias_, _alias_: This is how the Bluemoji is named, reflected in the
  record's `rkey`. When detected by the Bluemoji facet (see below), these are
  decorated with metadata allowing clients to render the Bluemoji. The record
  name itself must match `\b[a-z0-9-]+\b` and does not include `:` characters;
  when written prior to faceting, it is written wrapped in `:` character (e.g.,
  `:alias-name:`), hereafter referred to as a "colon-wrapped alias".

- _Bluemoji collection_: The `blue.moji.collection.item` collection; all of an
  individual user's collected Bluemoji. Not to be confused with the generic
  ATProto term "collection".

- _Bluemoji facet_: The `app.bsky.richtext.facet` facet feature available at
  [`blue.moji.richtext.facet`][schema_richtext_facet], which enables text to be
  annotated as containing a reference to a Bluemoji item.

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
  are able to themselves flag their emoji might be offensive to some audience by
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
  other platforms with custom emoji with legal requests, it's not imperceptible
  that they would at some point. These would have to be handled by individual
  PDSes given that's where the emoji asset data would reside at rest.

# Alternatives

What other designs have been considered? What is the impact of not doing this?

# Adoption strategy

If we implement this proposal, how will existing React developers adopt it? Is
this a breaking change? Can we write a codemod? Should we coordinate with other
projects or libraries?

# How we teach this

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing React patterns?

Would the acceptance of this proposal mean the React documentation must be
re-organized or altered? Does it change how React is taught to new developers at
any level?

How should this feature be taught to existing React developers?

# Unresolved questions

Optional, but suggested for first drafts. What parts of the design are still
TBD?

[schema_collection_item]: ../schema/blue.moji/collection/item.json
[schema_richtext_facet]: ../schema/blue.moji/richtext/facet.json
[richtext_impl]: ../lib/src//facet/BluemojiRichText.ts
