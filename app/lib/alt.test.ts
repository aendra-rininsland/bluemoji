import assert from "node:assert/strict";
import { ALT_MAX_GRAPHEMES, altError, defaultAlt } from "./alt.ts";

assert.equal(defaultAlt("blobcat_happy"), "blobcat happy");
assert.equal(defaultAlt(":blobcat_happy:"), "blobcat happy");
assert.equal(defaultAlt("a.b-c__d"), "a b c d");
assert.equal(defaultAlt("猫_ねこ"), "猫 ねこ");
assert.equal(defaultAlt("_x_"), "x");
assert.equal(defaultAlt(""), "");

assert.equal(altError(""), null, "empty is allowed");
assert.equal(altError("   "), null);
assert.equal(altError("a".repeat(ALT_MAX_GRAPHEMES)), null);
assert.match(altError("a".repeat(ALT_MAX_GRAPHEMES + 1)) ?? "", /too long/);
assert.equal(altError("🙂".repeat(ALT_MAX_GRAPHEMES)), null, "counts graphemes, not UTF-16 units");
assert.equal(altError("👨‍👩‍👧‍👦".repeat(ALT_MAX_GRAPHEMES)), null, "ZWJ sequences count once");
assert.equal(
  altError(" " + "a".repeat(ALT_MAX_GRAPHEMES) + " "),
  null,
  "surrounding whitespace is trimmed first",
);
console.log("alt helper tests passed");
