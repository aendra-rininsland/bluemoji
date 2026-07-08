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
