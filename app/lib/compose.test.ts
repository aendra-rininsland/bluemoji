import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { validateRecord } from "@bigmoves/lexicon";
import {
  autocompleteToken,
  buildEmojiFacets,
  emojiByAlias,
  findEmoji,
  previewParts,
  suggest,
  type ComposeEmoji,
} from "./compose.ts";

const DID = "did:plc:ewvi7nxzyoun6zhxrhs64oiz";
const CID = "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
const mk = (name: string, extra: Partial<ComposeEmoji> = {}): ComposeEmoji => ({
  uri: `at://${DID}/blue.moji.collection.item/${name.replace(/:/g, "")}`,
  cid: CID,
  did: DID,
  name,
  formatCids: { png_128: CID },
  ...extra,
});
const emoji = [
  mk(":blobcat:"),
  mk(":blobcat_happy:", { alt: "happy" }),
  mk(":猫:"),
  mk(":nocids:", { formatCids: {} }),
];
const byAlias = emojiByAlias(emoji);

// --- findEmoji: UTF-8 byte offsets, not UTF-16 indices
const text = "héllo 🙂 :blobcat: and :猫:!";
const found = findEmoji(text, byAlias);
assert.deepEqual(
  found.map((m) => m.emoji.name),
  [":blobcat:", ":猫:"],
);
const bytes = new TextEncoder().encode(text);
for (const m of found) {
  const slice = new TextDecoder().decode(bytes.slice(m.byteStart, m.byteEnd));
  assert.equal(slice, text.slice(m.start, m.end), "byte range decodes to the same :name:");
}
assert.ok(found[0].byteStart > found[0].start, "multibyte text shifts byte offsets");

// --- things that must not match
assert.equal(findEmoji("it is 12:30:45 now", byAlias).length, 0, "clock times");
assert.equal(findEmoji(":unknown: :nocids:", byAlias).length, 0, "unknown / no renditions");
assert.equal(findEmoji(":BlobCat:", byAlias).length, 1, "aliases are case-insensitive");
assert.equal(findEmoji(":blobcat::blobcat_happy:", byAlias).length, 2, "adjacent emoji");

// --- facets validate against the real lexicons
const lexicons: unknown[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".json")) lexicons.push(JSON.parse(readFileSync(p, "utf8")));
  }
};
walk(new URL("../../lexicons", import.meta.url).pathname);
const post = {
  $type: "app.bsky.feed.post",
  text,
  createdAt: new Date().toISOString(),
  facets: buildEmojiFacets(found),
};
assert.equal(validateRecord(lexicons as any, "app.bsky.feed.post", post), null);
const withAlt = buildEmojiFacets(findEmoji(":blobcat_happy:", byAlias));
assert.equal((withAlt[0].features[0] as any).alt, "happy");
assert.equal(
  validateRecord(lexicons as any, "app.bsky.feed.post", {
    ...post,
    text: ":blobcat_happy:",
    facets: withAlt,
  }),
  null,
);

// --- preview
assert.deepEqual(
  previewParts("a :blobcat: b", findEmoji("a :blobcat: b", byAlias)).map((p) =>
    "text" in p ? p.text : p.emoji.name,
  ),
  ["a ", ":blobcat:", " b"],
);

// --- autocomplete
assert.deepEqual(autocompleteToken("hi :bl", 6), { start: 3, query: "bl" });
assert.deepEqual(autocompleteToken(":b", 2), { start: 0, query: "b" });
assert.equal(autocompleteToken("12:30", 5), null, "colon inside a word");
assert.equal(autocompleteToken("hi :blobcat: x", 14), null, "already closed");
assert.equal(autocompleteToken("hi :", 4), null, "needs at least one letter");
assert.deepEqual(
  suggest(emoji, "cat").map((e) => e.name),
  [":blobcat:", ":blobcat_happy:"],
);
assert.deepEqual(
  suggest(emoji, "blobcat_").map((e) => e.name),
  [":blobcat_happy:"],
);
assert.deepEqual(suggest(emoji, "zzz"), []);
console.log("compose helper tests passed");
