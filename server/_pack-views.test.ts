// emojiRef.formats must match the lexicon: blue.moji.richtext.facet#formats_v1,
// one CID string per slot. The AppView used to return the stored item's blob
// objects (collection.item#formats_v1, with a 1 MB `original`), which is a
// different type that shares the name (issue #30).
import assert from "node:assert/strict";
import { emojiRefFormats, verifiedEmojiRef } from "./_pack-views.ts";

const PNG = "bafkreihczxqpp7mth45q4eg4gyzewb3epdfqrr3elhabrq4ujzsuyb4aqa";
const WEBP = "bafkreihzubkn6h46op63scfwtbzlc2svsyqebkdwooqf43edr4qju6vil4";
const ORIG = "bafkreig4eso2olkb7x7pkhjqplmejy25c2mjnllumbzmnasndpsiehs7cy";
const blob = (cid: string, mimeType = "image/png", size = 100) => ({
  $type: "blob",
  ref: { $link: cid },
  mimeType,
  size,
});
const FACET_V1 = "blue.moji.richtext.facet#formats_v1";

// A v1 item as stored: blob objects, plus the 1 MB `original` that has no place in an emojiRef
assert.deepEqual(
  emojiRefFormats({
    $type: "blue.moji.collection.item#formats_v1",
    original: blob(ORIG, "image/png", 307612),
    png_128: blob(PNG),
    webp_128: blob(WEBP, "image/webp"),
  }),
  { $type: FACET_V1, png_128: PNG, webp_128: WEBP },
);
console.log("ok - blob objects become CID strings; original and blob metadata are dropped");

// hatk returns union sub-objects with blob refs as JSON strings and absent keys as null (gotcha #2)
assert.deepEqual(
  emojiRefFormats({
    original: JSON.stringify(blob(ORIG)),
    png_128: JSON.stringify(blob(PNG)),
    webp_128: null,
    gif_128: null,
  }),
  { $type: FACET_V1, png_128: PNG },
);
console.log("ok - serialised blob refs and nulls from the database are handled");

// Already CID strings (a facet-shaped value) pass through
assert.deepEqual(emojiRefFormats({ png_128: PNG }), { $type: FACET_V1, png_128: PNG });

// A legacy v0 item has no CID for its raw-bytes slots: leave them out rather than invent one.
// A base64 string that happens to look like a CID must not be mistaken for one.
assert.deepEqual(
  emojiRefFormats({
    png_128: blob(PNG),
    apng_128: { $bytes: "iVBORw0KGgo" },
    lottie: "abcdefghijklmnopqrstuvwxyz234567abcdefghij",
  }),
  { $type: FACET_V1, png_128: PNG },
);
console.log("ok - slots with no blob are left out");

// Nothing usable
assert.deepEqual(emojiRefFormats(undefined), { $type: FACET_V1 });
assert.deepEqual(emojiRefFormats(null), { $type: FACET_V1 });
assert.deepEqual(emojiRefFormats("nope"), { $type: FACET_V1 });
assert.deepEqual(emojiRefFormats({ png_128: "not-a-cid", webp_128: { ref: {} } }), {
  $type: FACET_V1,
});

// Only known slots are copied: an unknown key (or a prototype-ish one) never reaches a client
const sneaky = JSON.parse(
  '{"__proto__": {"x": 1}, "png_128": "' + PNG + '", "evil": "' + WEBP + '"}',
);
assert.deepEqual(emojiRefFormats(sneaky), { $type: FACET_V1, png_128: PNG });

// The whole emojiRef, as get-reactions, get-reaction-counts and get-trending return it
const uri = "at://did:plc:abcdefghijklmnopqrstuvwx/blue.moji.collection.item/blobcat";
const verified = new Map([
  [
    uri,
    {
      uri,
      cid: "bafyreidq6wnal63g3fupex6enagy5k6d65sogygattfhrynwin53ylirsm",
      value: {
        name: ":blobcat:",
        alt: "a cat",
        adultOnly: true,
        formats: { original: blob(ORIG), png_128: blob(PNG), webp_128: blob(WEBP, "image/webp") },
      },
    },
  ],
]);
assert.deepEqual(verifiedEmojiRef({ uri }, verified), {
  $type: "blue.moji.feed.reaction#emojiRef",
  uri,
  cid: "bafyreidq6wnal63g3fupex6enagy5k6d65sogygattfhrynwin53ylirsm",
  name: ":blobcat:",
  alt: "a cat",
  adultOnly: true,
  formats: { $type: FACET_V1, png_128: PNG, webp_128: WEBP },
});
assert.equal(
  verifiedEmojiRef({ uri: "at://x/y/z" }, verified),
  null,
  "an unverifiable claim is dropped",
);
assert.equal(verifiedEmojiRef({}, verified), null);
console.log("ok - verifiedEmojiRef returns the lexicon's shape");
console.log("pack views tests passed");
