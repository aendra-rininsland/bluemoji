import assert from "node:assert/strict";
import {
  COMMON_LICENSES,
  LICENSE_MAX_BYTES,
  SOURCE_MAX_BYTES,
  cleanProvenance,
  licenseError,
  isCopyable,
  licenseLabel,
  licenseUrl,
  normalizeLicense,
  parseSpdx,
  safeHref,
  sourceError,
  sourceHost,
} from "./provenance.ts";

// ---------------------------------------------------------- SPDX expressions
const valid = [
  "MIT",
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-NC-SA-4.0",
  "Apache-2.0",
  "GPL-2.0+",
  "GPL-3.0-or-later",
  "MIT OR Apache-2.0",
  "MIT AND BSD-3-Clause",
  "Apache-2.0 WITH LLVM-exception",
  "(MIT OR Apache-2.0) AND CC-BY-4.0",
  "MIT OR (Apache-2.0 AND BSD-2-Clause)",
  "LicenseRef-All-Rights-Reserved",
  "LicenseRef-my.custom-1",
  "DocumentRef-spdx-tool-1.2:LicenseRef-MIT-Style-2",
  "GPL-2.0-only WITH Classpath-exception-2.0 OR MIT",
  "((MIT))",
];
for (const e of valid) assert.deepEqual(parseSpdx(e), { ok: true }, e);
const invalid = [
  "",
  "   ",
  "MIT OR",
  "OR MIT",
  "MIT AND AND Apache-2.0",
  "MIT Apache-2.0",
  "(MIT",
  "MIT)",
  "()",
  "MIT WITH",
  "WITH exception",
  "Apache 2.0",
  "CC BY 4.0",
  "MIT/Apache",
  "mit_license",
  "NONE",
  "NOASSERTION",
  "MIT OR NONE",
  "https://example.com/license",
  "<script>",
  "MIT, Apache-2.0",
  "LicenseRef-bad_char",
];
for (const e of invalid) assert.equal(parseSpdx(e).ok, false, JSON.stringify(e));
console.log("ok - SPDX expression grammar");

// ------------------------------------------------------------- normalising
assert.equal(normalizeLicense("cc-by-4.0"), "CC-BY-4.0");
assert.equal(normalizeLicense("  mit   or   apache-2.0 "), "MIT OR Apache-2.0");
assert.equal(normalizeLicense("(mit or cc0-1.0) and cc-by-4.0"), "(MIT OR CC0-1.0) AND CC-BY-4.0");
assert.equal(normalizeLicense("gpl-2.0+"), "gpl-2.0+", "unknown ids are left as typed");
assert.equal(normalizeLicense("MIT"), "MIT");
assert.equal(licenseError("cc-by-sa-4.0"), null, "lower-case input is accepted");
assert.equal(licenseError("mit or apache-2.0"), null);
assert.equal(licenseError(""), null, "empty means unspecified");
assert.match(licenseError("Apache 2.0") ?? "", /valid license identifier|Unexpected/);
assert.match(licenseError("MIT OR") ?? "", /ends too early/);
assert.match(licenseError("NONE") ?? "", /Leave the license empty/);
assert.match(licenseError("MIT-" + "x".repeat(LICENSE_MAX_BYTES)) ?? "", /too long/);
for (const l of COMMON_LICENSES) assert.equal(licenseError(l.id), null, `${l.id} is a valid pick`);
console.log("ok - normalising and licenseError");

// --------------------------------------------------------- license helpers
assert.equal(licenseLabel("CC-BY-4.0"), "CC BY 4.0 — attribution");
assert.equal(licenseLabel("cc-by-4.0"), "CC BY 4.0 — attribution");
assert.equal(licenseLabel("Weird-1.0"), "Weird-1.0");
assert.equal(licenseUrl("CC-BY-4.0"), "https://spdx.org/licenses/CC-BY-4.0.html");
assert.equal(licenseUrl("GPL-2.0+"), null, '"or later" has no single page');
assert.equal(licenseUrl("MIT OR Apache-2.0"), null, "no single page for an expression");
assert.equal(licenseUrl("LicenseRef-All-Rights-Reserved"), null);
assert.equal(licenseUrl("../../evil"), null);
assert.equal(licenseUrl("javascript:alert(1)"), null);
console.log("ok - labels and SPDX links");

assert.equal(isCopyable(undefined), false);
assert.equal(isCopyable(null), false);
assert.equal(isCopyable(""), false);
assert.equal(isCopyable("LicenseRef-All-Rights-Reserved"), false);
assert.equal(isCopyable("licenseref-all-rights-reserved"), false);
assert.equal(isCopyable("LicenseRef-All-Rights-Reserved AND MIT"), false);
assert.equal(isCopyable("LicenseRef-All-Rights-Reserved OR CC-BY-4.0"), true);
assert.equal(isCopyable("CC-BY-4.0"), true);
assert.equal(isCopyable("CC-BY-NC-ND-4.0"), true);
console.log("ok - copy gating");

// ------------------------------------------------------------------ source
for (const ok of [
  "https://example.com",
  "http://example.com/a/b?c=d#e",
  "https://files.mastodon.social/x/y.png",
  "https://例え.jp/絵",
]) {
  assert.equal(sourceError(ok), null, ok);
  assert.ok(safeHref(ok), ok);
}
for (const bad of [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "ftp://example.com/x",
  "file:///etc/passwd",
  "//example.com",
  "example.com",
  "https://",
  "https://user:pw@example.com/",
  "https://exa mple.com",
  "https://example.com/a b",
  "vbscript:x",
  "blob:https://example.com/uuid",
  "at://did:plc:x/blue.moji.collection.item/y",
]) {
  assert.notEqual(sourceError(bad), null, `sourceError should reject ${bad}`);
  assert.equal(safeHref(bad), null, `safeHref should reject ${bad}`);
}
assert.equal(sourceError(""), null);
assert.equal(safeHref(""), null);
assert.equal(safeHref(null), null);
assert.equal(safeHref("  https://example.com/x  "), "https://example.com/x", "trims");
assert.equal(
  safeHref("https://example.com/" + "a".repeat(SOURCE_MAX_BYTES)),
  null,
  "over the length cap",
);
assert.match(sourceError("https://example.com/" + "a".repeat(SOURCE_MAX_BYTES)) ?? "", /too long/);
// a control character or newline smuggled into a "link" is refused
assert.equal(safeHref("https://example.com/\nx"), null);
assert.equal(safeHref("https://example.com/\u0000"), null);
assert.equal(sourceHost("https://www.example.com/x"), "example.com");
assert.equal(sourceHost("https://files.example.com:8080/x"), "files.example.com:8080");
console.log("ok - source URLs: http(s) only, no credentials, no javascript:/data:");

// --------------------------------------------------------- cleanProvenance
assert.deepEqual(cleanProvenance("", ""), {});
assert.deepEqual(cleanProvenance(undefined, null), {});
assert.deepEqual(cleanProvenance("  cc-by-4.0 ", " https://example.com/art "), {
  license: "CC-BY-4.0",
  source: "https://example.com/art",
});
assert.deepEqual(cleanProvenance("MIT", ""), { license: "MIT" });
assert.deepEqual(
  cleanProvenance("", "https://example.com"),
  { source: "https://example.com/" },
  "normalised URL",
);
assert.ok("error" in cleanProvenance("Apache 2.0", ""));
assert.ok("error" in cleanProvenance("MIT", "javascript:alert(1)"));
console.log("ok - cleanProvenance");

// ----------------------------------------------------------- viewProvenance
import { provenanceError, viewProvenance } from "./provenance.ts";
assert.deepEqual(viewProvenance("cc-by-4.0", "https://example.com/x"), {
  license: "CC-BY-4.0",
  source: "https://example.com/x",
});
assert.deepEqual(viewProvenance(null, null), {});
assert.deepEqual(viewProvenance("", ""), {});
// untrusted record data: each bad field is dropped independently
assert.deepEqual(viewProvenance("not a license!!", "https://example.com/x"), {
  source: "https://example.com/x",
});
assert.deepEqual(viewProvenance("MIT", "javascript:alert(1)"), { license: "MIT" });
assert.deepEqual(viewProvenance("<img onerror=x>", "data:text/html,hi"), {});
assert.deepEqual(viewProvenance("NONE", "ftp://example.com"), {});
assert.equal(provenanceError("MIT", "https://example.com"), null);
assert.match(provenanceError("MIT", "nope") ?? "", /full URL/);
assert.match(provenanceError("Apache 2.0", "") ?? "", /identifier|Unexpected/);
console.log("ok - viewProvenance drops invalid values independently");
console.log("provenance tests passed");
