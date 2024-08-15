# Bluemoji Server 💙

This is a work-in-progress server implementation of Bluemoji intended to facilitate the creation and use of Bluemoji.

## Components

### @moji.blue Bluesky Bot

This listens to the firehose for the creation of `blue.moji.collection.item` records and
posts new ones (i.e., ones without a `copyOf` property) to Bluesky, with a link to let
users copy them to their collections.

### ImgProxy implementation

The Bluesky CDN ImgProxy implementation is restricted from rendering animation and doesn't
support smaller image dimensions. Hosting my own ImgProxy opens up the ability to serve animated
GIF and WebP assets, but given how bad those currently look when converting from APNG I'm tempted
to not bother. Perhaps if ImgProxy ever adds APNG support I'll more seriously consider this.

### Bluemoji Packs

The long-term goal is to allow users to add their Bluemoji to shareable "packs", similar
to how Starter Packs work. While much of the

## Structure

```
lib
├── actions # Curriable actions for creating workflows
│
├── feeds # Custom Feeds intended to show off Bluemoji
│
├── methods # Endpoints
│   ├── blob.ts # GET /blob/{did}/{cid}; returns PNG, GIF or WebP buffer. Used by ImgProxy.
│   ├── describe-generator.ts # GET /xrpc/app.bsky.feed.describeFeedGenerator
│   └── feed-generation.ts # GET /xrpc/app.bsky.feed.getFeedSkeleton
│
└── well-known.ts # GET /.well-known/* endpoints
```
