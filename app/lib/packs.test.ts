import assert from "node:assert/strict";
import { graphemeCount, packDescriptionError, packNameError } from "./packs.ts";

assert.equal(graphemeCount("abc"), 3);
assert.equal(graphemeCount("👨‍👩‍👧‍👦"), 1, "ZWJ family is one grapheme");
assert.equal(graphemeCount("🇪🇸🇪🇸"), 2, "two flags");

assert.equal(packDescriptionError(""), null);
assert.equal(packDescriptionError("a".repeat(300)), null);
assert.match(packDescriptionError("a".repeat(301)) ?? "", /max 300/);
// 300 emoji is fine by graphemes (and well under 3000 bytes only if narrow)
assert.equal(packDescriptionError("🙂".repeat(300)), null, "300 emoji = 1200 bytes, allowed");
// 300 ZWJ families = 300 graphemes but ~25 bytes each = 7500 bytes → rejected on bytes
assert.match(packDescriptionError("👨‍👩‍👧‍👦".repeat(300)) ?? "", /bytes/);
assert.equal(packNameError("Blobcats"), null);
assert.match(packNameError("  ") ?? "", /name/);
assert.equal(packNameError("a".repeat(64)), null);
assert.match(packNameError("a".repeat(65)) ?? "", /too long/);
assert.match(packNameError("猫".repeat(22)) ?? "", /too long/, "22 CJK chars = 66 bytes");
console.log("packs helper tests passed");
