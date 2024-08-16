# Bluemoji Schemata

This contains the schema for the Bluemoji project.

It is arranged as such:

```
blue.moji
├── collection
│   ├── defs.json
│   └── item.json
├── pack
│   ├── defs.json
│   ├── getPack.json
│   └── listitem.json
└── richtext
    └── facet.json
```

## High-level overview

### `blue.moji.collection`

Bluemoji are records of type `blue.moji.collection.item` keyed by emoji name (sans colons) that have the following properties:

- **`name`** - The name of the Bluemoji, wrapped in colon (`:`) characters. E.g., `:bluemoji:`
- **`createdAt`** - ISO 8601 timestamp for when the Bluemoji record was created
- **`formats`** - Object with various versions of the asset (version 0 below):
  - **`original`** - `Blob`-type object containing the original asset; not used with Lottie assets.
  - **`png_128`** Original asset resized to a 128px² static PNG; the default format. This may
    eventually become a required format to facilitate non-animated fallbacks. This is stored as `Blob`.
  - **`lottie`** A dotLottie asset. Currently only the dotLottie format is supported. This is stored as `Bytes`.
  - **`apng_128`** Original asset resized to a 128px² animated PNG. This is stored as `Bytes`.
  - ~~**`gif_128`** Original asset resized to a 128px² static or animated GIF. This is stored as `Blob`.~~ Currently unsupported.
  - ~~**`webp_128`** Original asset resized to a 128px² static or animated WebP. This is stored as `Blob`.~~ Currently unsupported.

An `alt` property for the alt text of the emoji is allowed but this is currently not required. I really want to make this mandatory, but I know users will type in rubbish to get around validation and I have no ability to moderate `Bluemoji` records myself, so alt text is currently optional.

The `formats` object is expected to be flexible depending on emergent needs and formats. Its `$type` property references the version, e.g. `blue.moji.collection.item#formats_v0`. Validate
payloads using the `@aendra/lexicons` package to ensure the correct version is being used.

A `blue.moji.collection.item` record may have a `copyOf` property referencing an `at-uri`; this
is intended to facilitate emoji sharing. It is intended that copies of copies reference
the original `copyOf` URI instead the copy's `at-uri`.

A `blue.moji.collection.item` record may also have an `adultOnly` boolean property to flag
age-appropriateness.

### `blue.moji.richtext.facet`

The Bluemoji RichText facet type is provided by this schema. Bluemoji facets must have the following properties:

- **`did`** The DID of the Bluemoji user.
- **`name`** The name of the Bluemoji, wrapped with colons (`:bluemoji:`).
- **`formats`** Various formats of the asset, intended for rendering

The following properties are optional:

- **`alt`** Alt text from original record. See previous section.
- **`adultOnly`** Boolean flag to toggle age appropriateness. This needs to be present on the facet to prevent a round-trip if adult content is disabled.

The **`formats`** property is different here than in `blue.moji.collection.item` and
is much simpler to reduce facet size. It contains any of the following:

- **`png_128`** The CID of the 128px² static PNG `Blob`.
- **`lottie`** Boolean indicating the facet contains a dotLottie `Bytes` asset.
- **`apng_128`** Boolean indicating the facet contains an animated PNG `Bytes` asset.
- ~~**`webp_128`** The CID of the 128px² animated WebP `Blob`.~~ Currently unsupported.
- ~~**`gif_128`** The CID of the 128px² animated GIF `Blob`.~~ Currently unsupported.

The intention for `Blob` objects is that they're fetched from the CDN via constructed asset
URLs such as `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${cid}@${type}`. Not hard-coding the asset URL into the facet enables ImgProxy CDNs other than Bluesky's to be used, depending
on implementer needs.

### `blue.moji.pack`

**Currently under heavy development**

This contains the `blue.moji.pack.record` schema, which will be used to create
shareable lists of Bluemoji. Eventually this will contain schemata for the server endpoints intended to facilitate this.
