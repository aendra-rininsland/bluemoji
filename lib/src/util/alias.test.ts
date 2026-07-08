import test from "node:test";
import assert from "node:assert";
import { aliasToRkey, rkeyToAlias, normalizeAlias, punycodeEncode } from "./alias";

test("ASCII aliases pass through unchanged", () => {
  assert.strictEqual(aliasToRkey("blobcat"), "blobcat");
  assert.strictEqual(aliasToRkey(":blobcat:"), "blobcat");
  assert.strictEqual(aliasToRkey(":Blob_Cat.v2:"), "blob_cat.v2");
});

test("matches known IDN Punycode vectors", () => {
  assert.strictEqual(aliasToRkey("münchen"), "xn--mnchen-3ya");
  assert.strictEqual(aliasToRkey("MÜNCHEN"), "xn--mnchen-3ya");
  assert.strictEqual(aliasToRkey("日本語"), "xn--wgv71a119e");
  assert.strictEqual(aliasToRkey("bücher"), "xn--bcher-kva");
  assert.strictEqual(punycodeEncode("münchen"), "mnchen-3ya");
});

test("round-trips Unicode aliases including emoji sequences", () => {
  for (const alias of ["🦋", "💙🦋", "ब्लॉब-कैट", "한국어", "🏳️‍🌈", "éxämple"]) {
    const rkey = aliasToRkey(alias);
    assert.match(rkey, /^[A-Za-z0-9._:~-]{1,512}$/, `rkey must be spec-legal: ${rkey}`);
    assert.strictEqual(rkeyToAlias(rkey), normalizeAlias(alias));
  }
});

test("NFC canonicalisation: composed and decomposed forms collide", () => {
  const composed = "café"; // café, U+00E9
  const decomposed = "café"; // café, e + combining acute
  assert.strictEqual(aliasToRkey(composed), aliasToRkey(decomposed));
});

test("rejects invalid aliases", () => {
  assert.throws(() => aliasToRkey(""), /empty/);
  assert.throws(() => aliasToRkey("::"), /empty/);
  assert.throws(() => aliasToRkey("has space"), /whitespace/);
  assert.throws(() => aliasToRkey("a:b"), /':'/);
  assert.throws(() => aliasToRkey("xn--fake"), /third and fourth/);
  assert.throws(() => aliasToRkey("ab--cd"), /third and fourth/);
  assert.throws(() => aliasToRkey("bad‮char"), /bidirectional/);
  assert.throws(() => aliasToRkey("-leading"), /ASCII aliases/);
  assert.throws(() => aliasToRkey("trailing."), /ASCII aliases/);
  assert.throws(() => aliasToRkey("x".repeat(65)), /too long/);
});

test("rkeyToAlias passes plain rkeys through", () => {
  assert.strictEqual(rkeyToAlias("blobcat"), "blobcat");
  assert.strictEqual(rkeyToAlias("blob_cat.v2"), "blob_cat.v2");
});
