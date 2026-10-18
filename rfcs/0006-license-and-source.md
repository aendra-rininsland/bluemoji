- Start Date: 2026-10-17
- RFC PR:
- Bluemoji Issue:

# Summary

Two optional, self-asserted provenance fields on emoji items
(`blue.moji.collection.item`) and packs (`blue.moji.packs.pack`), and on their
AppView views:

- **`license`** — an [SPDX license expression](https://spdx.org/licenses/)
  saying how the emoji or pack may be reused.
- **`source`** — a URL for where it was originally published, for emoji that
  were re-uploaded from somewhere else.

Both are additive and optional: existing records stay valid and behave exactly
as before.

# Basic example

```json
{
  "$type": "blue.moji.collection.item",
  "name": ":blobcat_happy:",
  "createdAt": "2026-10-17T12:00:00.000Z",
  "license": "CC-BY-4.0",
  "source": "https://example.com/artists/blobcats",
  "formats": { "...": "..." }
}
```

`license` may be a compound expression (`MIT OR Apache-2.0`,
`CC-BY-4.0 AND LicenseRef-Artist-Terms`) or a `LicenseRef-…` identifier for
terms with no SPDX id.

# Motivation

Custom emoji are other people's artwork, and Bluemoji makes copying them
trivially easy (a copy is a new item in the copier's repo; see RFC 0002).
Nothing in the standard let an author say what reuse they permit, or let
someone re-uploading an emoji from elsewhere say where it came from. The
Mastodon and zip importers make the second case routine.

# Detailed design

## Fields

| Field     | Type                  | Limit      | On                                            |
| --------- | --------------------- | ---------- | --------------------------------------------- |
| `license` | string (SPDX expr.)   | 128 bytes  | item, pack, itemView, packView, packViewBasic |
| `source`  | string, `format: uri` | 2048 bytes | item, pack, itemView, packView, packViewBasic |

- **Absent means unspecified — not public domain.** There is deliberately no
  "none"/"unknown" value (SPDX `NONE` and `NOASSERTION` are rejected by our
  writers); omit the field instead.
- Both are **self-asserted by the record's owner**. Nothing verifies that the
  author really holds the rights they license, or that the source says what
  the owner claims. They are provenance hints, not legal advice or
  enforcement.
- `license` is validated for SPDX expression _syntax_ (ids with optional `+`,
  `WITH` exceptions, `AND`/`OR`, parentheses, `LicenseRef-…`), not for
  membership of the SPDX license list, which keeps growing.
- A pack's `license`/`source` describe the pack as a curated collection; they
  do not override the `license` of the items inside it.

## Safety (reading)

`source` is a URL written by anyone, and `format: uri` permits any scheme. So:

- Writers (the apps, `putItem`) accept only `http:`/`https:` URLs without
  credentials, and normalise licenses (`cc-by-4.0` → `CC-BY-4.0`).
- **Readers must not trust stored values.** The AppView re-validates both
  fields when building views and silently drops an invalid one (independently
  of the other), so a `javascript:`/`data:` source or a junk license never
  reaches a client. The reference UI additionally re-validates before
  rendering and only links `http(s)` sources (`rel="noopener noreferrer
nofollow ugc"`). Third-party clients rendering these fields from raw records
  SHOULD do the same.

## Copying

Copying duplicates a work into another repo, so it needs a grant from the
creator. The reference UI therefore **only offers "copy" when a license is
present and doesn't withhold copying**:

- no `license` → not copyable (silence is not permission);
- `LicenseRef-All-Rights-Reserved` → not copyable. This is the explicit
  "don't copy my work" marker. We use it instead of SPDX `NONE`, which means
  "no license information" and can be read as public domain; "all rights
  reserved" says what the creator means, is well-formed SPDX, and is already
  understood for creative work. (`proprietary` is software-flavoured and
  vaguer.)
- an expression with `OR` is copyable (an alternative may grant it); an
  expression that `AND`s all-rights-reserved with anything is not.

Any other license (including `-ND`/`-NC` Creative Commons ones, which allow
verbatim non-commercial/attributed copies) is copyable. A copy keeps the
license it was shared under and any `source` already present; its `copyOf`
field continues to record where it was copied from. The copier may edit either
afterwards.

This is a courtesy gate, not enforcement: ATProto lets anyone write a record
into their own repo, so a modified client can ignore it. Its value is that
honest apps and the reference AppView respect the creator's wishes by default.
Items created before this RFC have no license and become non-copyable until
their owner adds one; copies made earlier are unaffected.

## Importers

Mastodon and zip imports apply one license and source to the whole batch (and
to a newly created pack); the Mastodon importer pre-fills `source` with the
server's URL. Per-emoji values can be changed afterwards from the collection
editor.

# Drawbacks

Unverifiable claims can be wrong or malicious. We accept that: the fields help
good-faith users and give moderators a reference, and the alternative (no
place to put the information) is worse.

# Alternatives

- **A fixed enum of licenses.** Simpler UI but can't express compound or
  bespoke terms, and ages badly. SPDX expressions with a short list of common
  picks in the UI gets both.
- **Free-text license.** Not machine-readable.
- **License on the facet/embed.** Those are self-attested copies of item data
  (RFC 0001's amendment); provenance belongs on the item, which verifiers
  already treat as the source of truth.

# Adoption strategy

Purely additive; no migration. Old records have neither field and render as
before. The `@aendra/bluemoji` client types gain the optional properties.

# Unresolved questions

- Should stickers (`stickerFormats`) be able to carry a different license from
  the inline emoji of the same item?
- Machine-readable "may be copied" semantics (so a copy flow can warn or
  refuse for `-ND` / all-rights-reserved items) — left to a future RFC.
