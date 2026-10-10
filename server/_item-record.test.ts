// Regression test for the putItem 500: records must pass the real lexicon
// validator that hatk runs before every PDS write.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { validateRecord } from "@bigmoves/lexicon";
import { buildItemRecord } from "./_item-record.ts";

const lexicons: unknown[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".json")) lexicons.push(JSON.parse(readFileSync(p, "utf8")));
  }
};
walk(new URL("../lexicons", import.meta.url).pathname);

const blob = (mime: string, size: number) => ({
  $type: "blob",
  ref: { $link: "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku" },
  mimeType: mime,
  size,
});
const check = (item: Parameters<typeof buildItemRecord>[0]) => {
  const { rkey, record } = buildItemRecord(item);
  return { rkey, error: validateRecord(lexicons as any, "blue.moji.collection.item", record) };
};
const formats = { original: blob("image/png", 5000), png_128: blob("image/png", 4000) };

// What JSON gives the handler when the client omitted `alt`: no key at all.
let r = check({ name: ":blobcat_happy:", formats });
assert.equal(r.error, null, JSON.stringify(r.error));
assert.equal(r.rkey, "blobcat_happy");
assert.ok(!("alt" in buildItemRecord({ name: ":x:", formats }).record), "no alt key when unset");

r = check({ name: ":blobcat:", alt: "blobcat", formats });
assert.equal(r.error, null);

r = check({
  name: ":anim:",
  formats: { ...formats, webp_128: blob("image/webp", 9000) },
  stickerFormats: { webp_512: blob("image/webp", 100000) },
});
assert.equal(r.error, null, JSON.stringify(r.error));

assert.throws(() => buildItemRecord({ name: ":_bad:", formats }), /ASCII aliases/);
console.log("item-record tests passed");
