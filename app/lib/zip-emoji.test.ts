import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { aliasToRkey, normalizeAlias } from "./alias.ts";
import { scanEmojiZip, suggestName } from "./zip-emoji.ts";
import { crc32 } from "./zip.ts";

// ---------- suggestName: file name in, valid alias out
const cases: [string, string][] = [
  ["blobcat.png", "blobcat"],
  ["emoji/blobcat_happy.png", "blobcat_happy"],
  ["BlobCat.PNG", "BlobCat"],
  ["blob cat.gif", "blob_cat"],
  ["  spaced   out  .webp", "spaced_out"],
  ["blobcat.happy.png", "blobcat.happy"],
  ["_leading.png", "leading"],
  ["trailing-.png", "trailing"],
  ["ab--cd.png", "ab-cd"],
  ["with:colons.png", "withcolons"],
  ["猫 ねこ.webp", "猫_ねこ"],
  ["_猫_.png", "_猫_"],
  ["...png", "emoji"],
  ["__.png", "emoji"],
  ["noextension", "noextension"],
  [".hidden", "hidden"],
];
for (const [file, want] of cases) assert.equal(suggestName(file), want, file);
assert.equal([...suggestName("x".repeat(100) + ".png")].length, 64, "truncated to 64 code points");
// Every suggestion must be a name the importer accepts, whatever the input
for (const [file] of cases) {
  const s = suggestName(file);
  if (s === "猫_ねこ" || s === "_猫_" || /^[\p{L}\p{N}._-]+$/u.test(s)) {
    assert.doesNotThrow(() => aliasToRkey(s), `${file} -> ${s}`);
  }
}
assert.equal(aliasToRkey("BlobCat"), "blobcat");
assert.ok(normalizeAlias("猫_ねこ"));
console.log("ok - suggestName gives valid default aliases");

// ---------- scanEmojiZip against a real Info-ZIP archive + a hermetic one
function buildZip(files: { name: string; data: Uint8Array }[]): Blob {
  const parts: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const comp = deflateRawSync(f.data),
      name = Buffer.from(f.name),
      crc = crc32(f.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x800, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(f.data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x800, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(f.data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    parts.push(lh, name, comp);
    central.push(ch, name);
    offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(central),
    eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return new Blob([...parts, cd, eocd] as BlobPart[]);
}
const b64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));
const PNG = b64(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGP8z8Dwn4EIwDiqEAB/qgH/dY19wQAAAABJRU5ErkJggg==",
);
const GIF = b64("R0lGODlhCAAIAIEAAP8AAAAA/wAAAAAAACH5BAEAAAAALAAAAAAIAAgAAAIGjI+py+0PADs=");
const z = buildZip([
  { name: "pack/", data: new Uint8Array() },
  { name: "pack/blob cat.png", data: PNG },
  { name: "pack/sub/Party.GIF", data: GIF },
  { name: "pack/fake.png", data: new Uint8Array(Buffer.from("this is not an image")) },
  { name: "pack/logo.svg", data: new Uint8Array(Buffer.from("<svg/>")) },
  { name: "pack/readme.txt", data: new Uint8Array(Buffer.from("hi")) },
  { name: "pack/.DS_Store", data: new Uint8Array([1]) },
  { name: "__MACOSX/pack/._blob cat.png", data: new Uint8Array([1]) },
  { name: "pack/huge.png", data: new Uint8Array(1_100_000) },
]);
const r = await scanEmojiZip(z);
assert.deepEqual(
  r.images.map((i) => [i.filename, i.suggestedName, i.type, i.animated]),
  [
    ["blob cat.png", "blob_cat", "image/png", false],
    ["Party.GIF", "Party", "image/gif", false],
  ],
);
assert.deepEqual(
  Object.fromEntries(r.skipped.map((s) => [s.path, s.reason])),
  {
    "pack/fake.png": "not a PNG, GIF, WebP or JPEG image",
    "pack/logo.svg": "SVG isn't supported",
    "pack/readme.txt": "not an image file",
    "pack/huge.png": "larger than 1 MB",
  },
  "junk (.DS_Store, __MACOSX) is silent; real problems are reported",
);
assert.equal(r.images[0].blob.type, "image/png");
console.log("ok - scanEmojiZip picks images, sniffs types, reports skips");

const cli = new Blob([
  readFileSync(new URL("./__fixtures__/cli.zip", import.meta.url)),
] as BlobPart[]);
const cliScan = await scanEmojiZip(cli);
assert.deepEqual(
  cliScan.images.map((i) => [i.path, i.suggestedName, i.type]),
  [["pack/sub/猫 ねこ.png", "猫_ねこ", "image/png"]],
);
assert.deepEqual(cliScan.skipped, [], ".DS_Store is ignored silently");
console.log("ok - reads an Info-ZIP archive (unicode + spaces in names)");
console.log("zip-emoji tests passed");
