# Bluemoji! 💙🦋

This is an attempt to build a new [Bluesky facet][1] that enables
custom emoji similar to on Mastodon.

To use:

1. Add `npm:@aendra/bluemoji` to your project
2. Import `RichText` from `@atproto/api`:

```js
import { RichText } from "@atproto/api";
```

3. Import `@aendra/bluemoji/register`:

```js
import "@aendra/bluemoji/register";
```

4. The `RichText` facet identifier will now return facets for text fragments like `:party-heart:` that
   correspond to a matching `dev.aendra.bsky.bluemoji` record in the related repo. :tada:

**Note that this doesn't work anywhere yet. Stay tuned for a client library to render these and an enhanced Bluesky app for adding them to your account**

## TODO:

- [ ] Animated PNG support
- [ ] Fork AppView

[1]: https://docs.bsky.app/docs/advanced-guides/post-richtext
