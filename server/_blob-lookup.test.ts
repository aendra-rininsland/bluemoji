import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { blobCidsFor, blobIsReferenced } from "./_blob-lookup.ts";

// A real SQLite database with the columns the lookup reads
const db = new Database(":memory:");
db.exec(`
  CREATE TABLE "blue.moji.collection.item" (uri TEXT, did TEXT, formats TEXT NOT NULL, sticker_formats TEXT);
  CREATE TABLE "blue.moji.packs.pack" (uri TEXT, did TEXT, icon TEXT);
`);
// hatk takes $1-style parameters; SQLite wants positional ones, so expand them in order of use
const query = async (sql: string, params: unknown[] = []) => {
  const values: unknown[] = [];
  const text = sql.replace(/\$(\d+)/g, (_, n) => {
    values.push(params[Number(n) - 1]);
    return "?";
  });
  return db.prepare(text).all(...values) as unknown[];
};

const ALICE = "did:plc:aaaaaaaaaaaaaaaaaaaaaaaa";
const BOB = "did:plc:bbbbbbbbbbbbbbbbbbbbbbbb";
const blob = (cid: string) => ({
  $type: "blob",
  ref: { $link: cid },
  mimeType: "image/png",
  size: 1,
});
const PNG = "bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const GIF = "bafkreibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const STICKER = "bafkreiccccccccccccccccccccccccccccccccccccccccccccccccccc";
const ICON = "bafkreiddddddddddddddddddddddddddddddddddddddddddddddddddd";
const OTHER = "bafkreieeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

db.prepare(`INSERT INTO "blue.moji.collection.item" VALUES (?, ?, ?, ?)`).run(
  "at://alice/item/1",
  ALICE,
  JSON.stringify({
    $type: "blue.moji.collection.item#formats_v1",
    png_128: blob(PNG),
    gif_128: blob(GIF),
  }),
  JSON.stringify({ $type: "blue.moji.collection.item#stickerFormats_v0", png_512: blob(STICKER) }),
);
db.prepare(`INSERT INTO "blue.moji.collection.item" VALUES (?, ?, ?, ?)`).run(
  "at://alice/item/2",
  ALICE,
  JSON.stringify({ $type: "blue.moji.collection.item#formats_v1", png_128: blob(OTHER) }),
  null,
);
db.prepare(`INSERT INTO "blue.moji.packs.pack" VALUES (?, ?, ?)`).run(
  "at://alice/pack/1",
  ALICE,
  JSON.stringify(blob(ICON)),
);

// Referenced renditions, sticker renditions and pack icons are all available
for (const cid of [PNG, GIF, STICKER, ICON, OTHER]) {
  assert.equal(await blobIsReferenced(query, ALICE, cid), true, cid);
}
console.log("ok - emoji renditions, sticker renditions and pack icons are available");

// Scoped to the repo: someone else's emoji can't be fetched through your DID, or vice versa
assert.equal(await blobIsReferenced(query, BOB, PNG), false, "another repo's blob");
assert.equal(
  await blobIsReferenced(
    query,
    ALICE,
    "bafkreizzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
  ),
  false,
);
console.log("ok - a blob is only available under the repo that references it");

// A prefix or fragment of a CID is not the CID
assert.equal(await blobIsReferenced(query, ALICE, PNG.slice(0, 30)), false);
assert.equal(await blobIsReferenced(query, ALICE, PNG + "a"), false);
console.log("ok - partial CIDs don't match");

// Anything that isn't a plain CID is refused before it reaches the query (LIKE wildcards, quotes)
for (const bad of ["%", "_", "bafk%", `x"y`, "", "a b"]) {
  assert.equal(await blobIsReferenced(query, ALICE, bad), false, JSON.stringify(bad));
}
console.log("ok - LIKE wildcards and junk are refused");

// Enumerating an account's blobs, for cache purging
assert.deepEqual((await blobCidsFor(query, ALICE)).sort(), [PNG, GIF, STICKER, ICON, OTHER].sort());
assert.deepEqual(await blobCidsFor(query, BOB), []);
console.log("ok - an account's blob CIDs can be enumerated (renditions, stickers, icons)");
console.log("blob lookup tests passed");
