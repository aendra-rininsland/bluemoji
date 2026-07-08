- Start Date: 2026-07-08
- RFC PR:
- Bluemoji Issue:

# Summary

Internationalised Bluemoji aliases. Aliases may contain (nearly) any Unicode,
including emoji; record keys remain spec-compliant ASCII by encoding non-ASCII
aliases with Punycode (RFC 3492) under the familiar `xn--` convention. This
RFC also relaxes the ASCII alias rule from RFC 0001 to the full sane subset of
the ATProto record-key character set, and supersedes RFC 0001's
`^(?!-)[a-z0-9-]+(?<!-)$` rule.

# Basic example

| Typed alias     | Canonical alias | Record key       |
| --------------- | --------------- | ---------------- |
| `:blobcat:`     | `blobcat`       | `blobcat`        |
| `:Blob_Cat.v2:` | `blob_cat.v2`   | `blob_cat.v2`    |
| `:MÜNCHEN:`     | `münchen`       | `xn--mnchen-3ya` |
| `:日本語:`      | `日本語`        | `xn--wgv71a119e` |
| `:🦋:`          | `🦋`            | `xn--bt9h`       |

The record's `name` field, facets, and all user-facing surfaces carry the
**canonical alias** (colon-wrapped). Only the rkey carries the encoded form.
Clients MUST render the decoded alias and SHOULD never display an `xn--` rkey.

# Motivation

ATProto record keys are restricted to ASCII `[A-Za-z0-9._:~-]` (see the
[record-key spec]); the PDS rejects anything else, so native Unicode rkeys are
impossible today. But an emoji system that cannot name an emoji `:日本語:` or
`:💙:` is anglocentric in a way the Atmosphere shouldn't be. Punycode is the
standards-blessed bridge: deterministic, reversible, ASCII-only output, and
proven at DNS scale for exactly this problem. Because the encoding is
deterministic, `getRecord`/`saveToCollection` lookups by alias remain O(1)
against a raw PDS — no AppView index required. If ATProto later relaxes rkeys
to native Unicode, implementations simply stop encoding new records and keep
decoding old ones, as the DNS world does.

# Detailed design

## Canonicalisation

Given user input (with or without wrapping colons), implementations MUST:

1. Strip wrapping `:` characters and trim ASCII whitespace.
2. Apply Unicode Normalization Form C (NFC).
3. Lowercase using locale-independent Unicode Default Case Conversion
   (`String.prototype.toLowerCase` semantics; not locale-tailored, not full
   case folding).
4. Re-apply NFC (lowercasing can denormalise).

The result is the **canonical alias**. Two inputs that canonicalise to the
same string are the same alias.

## Validation

A canonical alias is valid iff:

- It is 1–64 Unicode code points long.
- It contains no `:`, no whitespace (Unicode White_Space), no control
  characters (Cc), and no bidirectional control characters (U+200E, U+200F,
  U+202A–U+202E, U+2066–U+2069).
- Format characters (Cf) other than ZERO WIDTH JOINER (U+200D) are forbidden;
  ZWJ is permitted because emoji sequences require it. Variation selectors
  (U+FE0E/U+FE0F) are permitted (category Mn).
- Its third and fourth characters are not both `-` (the IDNA "??--" reservation;
  this keeps `xn--` unambiguous).

## Record key derivation

- If the canonical alias matches `^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$`
  (lowercase ASCII alphanumerics with `.`, `_`, `-` permitted in the interior
  only), the rkey **is** the alias. This is the relaxed ASCII rule: RFC 0001's
  `[a-z0-9-]` set plus `_` and `.`, up to 64 code points. (`.` and `..` alone
  are impossible because both ends must be alphanumeric.)
- Otherwise, the rkey is `xn--` followed by the RFC 3492 Punycode encoding of
  the whole canonical alias. Encoding is applied to the full string, not
  per-dot-label — aliases are not hostnames.
- Decoding: an rkey beginning `xn--` is always decoded (strip the prefix,
  Punycode-decode) to recover the alias; any other rkey is its own alias.

Note the deliberate asymmetry with IDNA: no UTS-46 mapping tables, no IDNA2008
letter-digit-hyphen restrictions (those would forbid emoji). The profile is
exactly the four canonicalisation steps plus the validation rules above, so
independent implementations produce identical rkeys.

## Fallback and display

Fallback text remains the colon-wrapped canonical alias (`:日本語:`), which now
carries meaningful content for non-Latin-script users. The `name` field in
`blue.moji.collection.item`, `blue.moji.richtext.facet`, and
`blue.moji.feed.reaction#emojiRef` always contains the colon-wrapped canonical
alias, never the encoded form.

## Text detection

Colon-wrapped alias detection in composers SHOULD match
`:([^\s:]{2,64}):` (Unicode-aware), excluding all-digit aliases to avoid
matching times (`3:30:45`), and then attempt resolution; unresolvable aliases
are left as plain text. Detection heuristics are non-normative.

# Drawbacks

- **Homoglyphs and confusables:** `:раypal:` (Cyrillic а) and `:paypal:` are
  distinct aliases. The stakes are low (an alias is not an authority claim),
  but clients SHOULD render the decoded form only, and MAY apply UTS #39
  mixed-script detection to flag suspicious aliases. AppView search SHOULD
  fold confusables when ranking.
- **Double-encoding confusion:** a user cannot create an ASCII alias that
  begins `xn--` or otherwise has `--` in positions 3–4; implementations MUST
  reject these at upload.
- **Length asymmetry:** 64 code points of CJK or emoji can encode to well over
  64 ASCII characters. The rkey budget (512) comfortably absorbs this; the
  64-code-point cap on the alias side keeps display sane.

# Alternatives

- **Wait for the rkey spec to relax.** The spec explicitly reserves the
  possibility, but with no timeline; Punycode degrades gracefully if it lands.
- **Percent-encoding into the rkey.** `%` is reserved-but-unsupported in
  record keys; not currently legal.
- **Name-as-data with TID rkeys.** Loses O(1) alias lookup against raw PDSes
  and makes alias collisions an AppView concern; rejected in RFC 0001's
  original design and the reasoning still holds.

# Adoption strategy

`@aendra/bluemoji` exports `normalizeAlias`, `aliasToRkey`, and `rkeyToAlias`;
the moji.blue AppView and upload UI use the same algorithm. Existing records
are untouched: every rkey valid under RFC 0001 is its own canonical alias
under this RFC.

# Unresolved questions

- Should the AppView enforce UTS #39 restriction levels at `putItem` time, or
  leave confusable handling entirely to clients?
- Is 64 code points the right cap, or should it be 64 grapheme clusters
  (multi-person ZWJ family emoji burn ~7 code points each)?

[record-key spec]: https://atproto.com/specs/record-key
