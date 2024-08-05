# Bluemoji! 💙🦋

This is the root of the Bluemoji mono-repo. It contains:

- **[/schema](schema/)** for the `blue.moji` schemata
- **[/facet](facet/)** Extends `@atproto/api` so the `RichText` class can create `blue.moji.richtext.facet` entities from `:emoji:` strings
- **[/lexicons](lexicons/)** for Lexicon TypeScript definitions

Note that this is all very work-in-progress. You won't be able to see Bluemoji until
either Bluesky adds @aendra/bluemoji to the app or a 3rd party dev does similar.

I may also deploy a fork of the Bluesky AppView at some point but probably not
until OAuth support arrives.

In the meantime, you can play with Bluemoji at:

https://observablehq.com/@aendra/bluemoji-tools
