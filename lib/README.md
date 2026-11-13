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

### Render

Once facets are attached to a record, you can render them using the helper libraries in `render/`:

```typescript
import { render } from "@aendra/bluemoji/render";
import { AtpAgent } from "@atproto/api";
import { record, credentials } from "./fixtures";

const agent = new AtpAgent({ service: "https://api.bsky.social" });
await agent.login({ ...credentials });

const [bluemojiFacet] = record.facets;
const element = render(bluemojiFacet, agent);

assert.ok(
  element instanceof HTMLCanvasElement || element instanceof HTMLImageElement,
  "Render returns either <img> (PNG, APNG) or <canvas> (dotLottie)",
);
```

### Image proxy

`@aendra/bluemoji/img-proxy` is the hardened `/img/{did}/{cid}` proxy that
moji.blue runs, as a framework-agnostic core built only on Web APIs (`fetch`,
`Request`/`Response`, Web Crypto), so an AppView can serve emoji pixels from its
own domain on Cloudflare Workers, Deno, Bun or Node.

```ts
import { createBlobProxy, checkBlobAuthorizer } from "@aendra/bluemoji/img-proxy";

const proxy = createBlobProxy({
  // Serve only blobs this AppView indexes as Bluemoji assets. Without it the
  // proxy serves any blob from any repo.
  authorize: checkBlobAuthorizer("https://moji.blue"),
});
export default { fetch: (request: Request) => proxy.fetch(request) };
```

It resolves the owner's PDS, refuses SVG/XML/HTML (stored XSS), checks the bytes
hash to the CID, caps the size while streaming, validates every redirect hop, and
sends a sandboxing CSP with immutable caching. Hostnames are checked by name; on
Node, pass `resolvePds` and `fetchBlob` hooks that pin addresses at connect time.
A ready Worker is in [`examples/cloudflare-worker`](examples/cloudflare-worker).

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
