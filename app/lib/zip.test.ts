import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { crc32, extractEntry, listZip, ZipError } from "./zip.ts";

// ---- real archives written by Python's zipfile (normal, and streamed with data descriptors)
const REAL = {
  normal:
    "UEsDBBQAAAAAAAAAIQAAAAAAAAAAAAAAAAAGAAAAZW1vamkvUEsDBBQAAAAIAF2bS134TCE2DgAAAF4BAAARAAAAZW1vamkvYmxvYmNhdC5wbmcL8HN3cQxxDBilaEEBAFBLAwQUAAAIAABdm0tdD6MGWQcAAAAHAAAADQAAAGVtb2ppL+eMqy5naWZHSUZEQVRBUEsDBBQAAAAAAF2bS105nPsGBAAAAAQAAAAcAAAAX19NQUNPU1gvZW1vamkvLl9ibG9iY2F0LnBuZ2p1bmtQSwMEFAAAAAAAXZtLXYamEDYFAAAABQAAAAoAAAByZWFkbWUudHh0aGVsbG9QSwECFAMUAAAAAAAAACEAAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAgAEAAAAAZW1vamkvUEsBAhQDFAAAAAgAXZtLXfhMITYOAAAAXgEAABEAAAAAAAAAAAAAAIABJAAAAGVtb2ppL2Jsb2JjYXQucG5nUEsBAhQDFAAACAAAXZtLXQ+jBlkHAAAABwAAAA0AAAAAAAAAAAAAAIABYQAAAGVtb2ppL+eMqy5naWZQSwECFAMUAAAAAABdm0tdOZz7BgQAAAAEAAAAHAAAAAAAAAAAAAAAgAGTAAAAX19NQUNPU1gvZW1vamkvLl9ibG9iY2F0LnBuZ1BLAQIUAxQAAAAAAF2bS12GphA2BQAAAAUAAAAKAAAAAAAAAAAAAACAAdEAAAByZWFkbWUudHh0UEsFBgAAAAAFAAUAMAEAAP4AAAAAAA==",
  streaming:
    "UEsDBBQACAAAAAAAIQAAAAAAAAAAAAAAAAAGAAAAZW1vamkvUEsHCAAAAAAAAAAAAAAAAFBLAwQUAAgACABdm0tdAAAAAAAAAAAAAAAAEQAAAGVtb2ppL2Jsb2JjYXQucG5nC/Bzd3EMcQwYpWhBAQBQSwcI+EwhNg4AAABeAQAAUEsDBBQACAgAAF2bS10AAAAAAAAAAAAAAAANAAAAZW1vamkv54yrLmdpZkdJRkRBVEFQSwcID6MGWQcAAAAHAAAAUEsDBBQACAAAAF2bS10AAAAAAAAAAAAAAAAcAAAAX19NQUNPU1gvZW1vamkvLl9ibG9iY2F0LnBuZ2p1bmtQSwcIOZz7BgQAAAAEAAAAUEsDBBQACAAAAF2bS10AAAAAAAAAAAAAAAAKAAAAcmVhZG1lLnR4dGhlbGxvUEsHCIamEDYFAAAABQAAAFBLAQIUAxQACAAAAAAAIQAAAAAAAAAAAAAAAAAGAAAAAAAAAAAAAACAAQAAAABlbW9qaS9QSwECFAMUAAgACABdm0td+EwhNg4AAABeAQAAEQAAAAAAAAAAAAAAgAE0AAAAZW1vamkvYmxvYmNhdC5wbmdQSwECFAMUAAgIAABdm0tdD6MGWQcAAAAHAAAADQAAAAAAAAAAAAAAgAGBAAAAZW1vamkv54yrLmdpZlBLAQIUAxQACAAAAF2bS105nPsGBAAAAAQAAAAcAAAAAAAAAAAAAACAAcMAAABfX01BQ09TWC9lbW9qaS8uX2Jsb2JjYXQucG5nUEsBAhQDFAAIAAAAXZtLXYamEDYFAAAABQAAAAoAAAAAAAAAAAAAAIABEQEAAHJlYWRtZS50eHRQSwUGAAAAAAUABQAwAQAATgEAAAAA",
};

const blobOf = (b64: string) => new Blob([Buffer.from(b64, "base64")] as BlobPart[]);
for (const [kind, b64] of Object.entries(REAL)) {
  const zip = blobOf(b64);
  const entries = await listZip(zip);
  assert.deepEqual(
    entries.map((e) => e.name),
    ["emoji/", "emoji/blobcat.png", "emoji/猫.gif", "__MACOSX/emoji/._blobcat.png", "readme.txt"],
    kind,
  );
  assert.ok(entries[0].directory && !entries[1].directory);
  const png = await extractEntry(zip, entries[1], 1_000_000); // deflated
  assert.equal(Buffer.from(png).toString(), "PNGDATA".repeat(50), kind + " deflate");
  const gif = await extractEntry(zip, entries[2], 1_000_000); // stored, unicode name
  assert.equal(Buffer.from(gif).toString(), "GIFDATA", kind + " stored");
}
console.log("ok - reads real zips (deflate, stored, directories, unicode names, data descriptors)");

// ---- hermetic writer for edge cases
interface W {
  name: string;
  data: Uint8Array;
  method?: 0 | 8;
  flags?: number;
  crc?: number;
  declaredSize?: number;
}
function buildZip(files: W[], opts: { comment?: string } = {}): Blob {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const method = f.method ?? 8;
    const comp = method === 8 ? deflateRawSync(f.data) : Buffer.from(f.data);
    const name = Buffer.from(f.name);
    const flags = f.flags ?? 0x800;
    const crc = f.crc ?? crc32(f.data);
    const size = f.declaredSize ?? f.data.length;
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(flags, 6);
    lh.writeUInt16LE(method, 8);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(size, 22);
    lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(flags, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(size, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    parts.push(lh, name, comp);
    central.push(ch, name);
    offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const comment = Buffer.from(opts.comment ?? "");
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(comment.length, 20);
  return new Blob([...parts, cd, eocd, comment] as BlobPart[]);
}
const bytes = (s: string) => new Uint8Array(Buffer.from(s));

// empty archive and archive comment
assert.deepEqual(await listZip(buildZip([])), []);
let z = buildZip([{ name: "a.png", data: bytes("hi") }], {
  comment: "PK fake eocd inside a comment ".repeat(3),
});
assert.equal((await listZip(z)).length, 1, "comment containing EOCD-like bytes");
console.log("ok - empty archives and archive comments");

// legacy (non-UTF-8-flag) names fall back to windows-1252
z = buildZip([{ name: "café.png", data: bytes("x"), flags: 0 }]);
assert.equal((await listZip(z))[0].name, "café.png", "valid UTF-8 without the flag still decodes");
console.log("ok - names decode without the UTF-8 flag");

// corruption: bad CRC, bad sizes, truncated archive, not a zip
z = buildZip([{ name: "a.png", data: bytes("hello world"), crc: 123 }]);
await assert.rejects(async () => extractEntry(z, (await listZip(z))[0], 1e6), /checksum/);
z = buildZip([{ name: "a.png", data: bytes("hello world"), declaredSize: 5 }]);
await assert.rejects(async () => extractEntry(z, (await listZip(z))[0], 1e6), ZipError);
await assert.rejects(
  listZip(new Blob([Buffer.from("definitely not a zip file at all")] as BlobPart[])),
  /doesn't look like a zip/,
);
await assert.rejects(listZip(new Blob([] as BlobPart[])), /doesn't look like a zip/);
const full = Buffer.from(
  await buildZip([{ name: "a.png", data: bytes("x".repeat(100)) }]).arrayBuffer(),
);
await assert.rejects(
  listZip(new Blob([full.subarray(0, full.length - 10)] as BlobPart[])),
  ZipError,
);
console.log("ok - corrupt, truncated and non-zip input are rejected");

// zip bomb: tiny compressed data that inflates far past its declared size
const big = new Uint8Array(5_000_000);
z = buildZip([{ name: "bomb.png", data: big, declaredSize: 1000 }]);
await assert.rejects(async () => extractEntry(z, (await listZip(z))[0], 1e6), ZipError);
z = buildZip([{ name: "big.png", data: big }]);
await assert.rejects(async () => extractEntry(z, (await listZip(z))[0], 1_000_000), /too large/);
console.log("ok - declared and actual sizes are capped (zip bombs)");

// unsupported features
z = buildZip([{ name: "enc.png", data: bytes("x"), flags: 0x801 }]);
await assert.rejects(async () => extractEntry(z, (await listZip(z))[0], 1e6), /password/);
const manyNames: W[] = Array.from({ length: 6 }, (_, i) => ({
  name: i + ".png",
  data: bytes("x"),
}));
await assert.rejects(listZip(buildZip(manyNames), 5), /Too many files/);
console.log("ok - encrypted entries and oversized archives are refused");

console.log("zip reader tests passed");
