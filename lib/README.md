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
  text: "Hello @aendra.com, check out this link: https://moji.blue :blue-kiss:"
});

await rt.detectFacets(agent); // automatically detects mentions and links

const postRecord = {
  $type: "app.bsky.feed.post",
  text: rt.text,
  facets: rt.facets,
  createdAt: new Date().toISOString()
};

// At least one facet will have a feature of type "blue.moji.richtext.facet"
assert.strictEquals(
  rt.facets.some((f) =>
    f.features.some((ff) => f.$type === "blue.moji.richtext.facet")
  ),
  true
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
  "Render returns either <img> (PNG, APNG) or <canvas> (dotLottie)"
);
```

### Components

A few components are in development for multiple targets. To start, I hope to include renderer components for:

- [ ] React
- [ ] React Native
- [ ] Web Component Custom Element

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
