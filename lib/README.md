# Bluemoji! 💙

This is all the client libraries for the Bluemoji project. This is what you need if
you're wanting to implement Bluemoji for your AppView.

## Installation

### Via NPM

```
$ npm install @aendra/bluemoji
```

## Usage

There are two things you'll need to do with this to make it work:

### 1. Facet

The facet (defined in the schema `blue.moji.richtext.facet`) extends the `@atproto/api` `RichText` class to support Bluemoji.
Use this instead of the first-party `RichText` class to enable your clients to attach Bluemoji facets to records.

```typescript
import { BluemojiRichText } from "@aendra/bluemoji/facet";
import { AtpAgent } from "@atproto/api";

const agent = new AtpAgent({ service: "https://api.bsky.social" });
await agent.login({ ...credentials });

// creating richtext
const rt = new BluemojiRichText({
  text: "Hello @aendra.com, check out this link: https://moji.blue :blue-kiss:",
});

await rt.detectFacets(agent); // automatically detects mentions and links

const postRecord = {
  $type: "app.bsky.feed.post",
  text: rt.text,
  facets: rt.facets,
  createdAt: new Date().toISOString(),
};

// At least one facet will have a feature of type "blue.moji.richtext.facet"
assert.strictEquals(
  rt.facets.some((f) => f.features.some((ff) => f.$type === "blue.moji.richtext.facet")),
  true,
);
```

### Verify

Facets (and sticker embeds, and reaction `emojiRef`s) are written by the poster
and never checked, so look the emoji up before you trust it:

```typescript
import { verifyEmojiClaim } from "@aendra/bluemoji/verify";

const verified = await verifyEmojiClaim(
  { did: facetFeature.did, name: facetFeature.name },
  { appviews: ["https://moji.blue"] }, // optional; there is no default AppView
);
if (verified) show(verified.item); // verified.via: "index" | "appview" | "pds"
```

It tries your own `index`, then the `appviews` you list in order, then the
owner's PDS. An AppView that says "not found" is final (so a takedown isn't
undone by the PDS); one that is down is skipped. `verified.moderated` is
`false` when only the PDS answered. On a server, pass a `fetch` that refuses
private addresses. See [RENDERING.md](../RENDERING.md#where-to-do-the-lookup).

To honour moderation without depending on an AppView, list the labelers you
trust (RFC 0007). They are DIDs; their endpoint and signing key come from their
DID document, and only labels they signed are believed:

```typescript
const verified = await verifyEmojiClaim(claim, {
  labelers: ["did:plc:…"], // e.g. the moji.blue moderation labeler
  // labelerFailure: "hide", // show nothing if a labeler can't be reached
});
// verified.labels            → ["bluemoji-adult", …] in force on the emoji or its owner
// verified.labelers          → { consulted, unavailable }
```

A `bluemoji-takedown` on the emoji or its owner makes it unverifiable (`null`);
`bluemoji-adult` sets `adultOnly`. `render()` also hides `bluemoji-abusive` and
`bluemoji-impersonation` emoji unless you pass `showLabelled: true`.

### Render

Once facets are attached to a record, `render()` turns one into an element. It
never draws from the facet itself: it verifies the emoji first (see
[Verify](#verify)) and renders what the real item record says, so a forged
`formats`, `alt` or `adultOnly` on a facet has no effect.

```typescript
import { render } from "@aendra/bluemoji/render";

const feature = post.facets
  ?.flatMap((f) => f.features)
  .find((f) => f.$type === "blue.moji.richtext.facet");

const element = await render(null, feature, {
  // How to look the emoji up. Defaults to the owner's PDS; list AppViews you
  // trust, or pass your own index. There is no default AppView.
  verify: { appviews: ["https://moji.blue"] },
  // Optional: route images through your own proxy/CDN instead of the PDS
  // blobUrl: (did, cid) => `https://img.example.com/${did}/${cid}`,
  adult: "show", // or "hide"; adult-only emoji get data-adult-only="true"
});

if (!element) {
  // Missing, taken down, or unreachable: show the ":name:" text instead
}
```

It returns an `<img>` (PNG, GIF, WebP, APNG) or a `<canvas>` (dotLottie), or
`undefined` when the emoji can't be verified. The first argument is the old
`agent` parameter, kept for compatibility and no longer used. Pass `raw: true` to
get a Lottie file's bytes instead of a canvas (React Native), or `player: true`
for `{ canvas, player }`.

On a server, give `verify.fetch` one that refuses private addresses (see Verify).
The old `renderBlobAsImg` helper in `render/renderers/blob` pointed at a Bluesky
avatar CDN that doesn't serve these blobs and is no longer used by `render()`.

### Emoji picker

`<blue-moji-picker>` is a drop-in Custom Element backed by an AppView's
`blue.moji.collection.searchItems` query — search-as-you-type, no client-side
index to build or maintain yourself:

```typescript
import { BluemojiPicker } from "@aendra/bluemoji/components/webcomponent/picker";
BluemojiPicker.register();
```

```html
<!-- omit repo for network-wide whole-word search; pass it to substring-search
     one user's own collection, which suits live composer autocomplete -->
<blue-moji-picker api-base="https://moji.blue" repo="did:plc:..."></blue-moji-picker>

<script>
  document.querySelector("blue-moji-picker").addEventListener("moji-pick", (e) => {
    // e.detail = { uri, did, name, alt }
    insertAtCursor(e.detail.name);
  });
</script>
```

`api-base` defaults to `https://moji.blue`; point it at any AppView exposing
`blue.moji.collection.searchItems` and an `/img/{did}/{cid}` blob proxy (or
override the `imgUrl` property with a custom resolver).

### Components

A few display components are in development for multiple targets. To start, I hope to include renderer components for:

- [ ] React
- [ ] React Native
- [x] Web Component Custom Element (`<blue-moji>`, single-emoji display — see `components/webcomponent/webcomponent.ts`)

## Repo Contents

```
src
├── facet # Facet parsing and creation
│
├── render # Facet rendering
│
├── util # Utility functions
│   ├── resizePngToUintArray.ts # Resize a PNG blob to Uint8Array
│   └── uploadBluemoji.ts # Create a blue.moji.collection.item record
│
└── components (these are all works-in-progress)
    ├── react # React renderer (WIP)
    ├── react-native # React Native renderer (WIP)
    └── webcomponent # Web Component renderer (WIP)
```
