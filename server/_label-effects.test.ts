import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { Secp256k1Keypair } from "@atproto/crypto";
import {
  appendLabel,
  ensureLabelTable,
  LabelInputError,
  validateApply,
  type LabelDb,
} from "./_labeler.ts";
import { blobIsReferenced } from "./_blob-lookup.ts";
import {
  labelStates,
  resetLabelEffectsCache,
  takendownItemUris,
  withoutTakenDownItems,
} from "./_label-effects.ts";

const SRC = "did:plc:mmmmmmmmmmmmmmmmmmmmmmmm";
const ALICE = "did:plc:aaaaaaaaaaaaaaaaaaaaaaaa";
const item = (rkey: string) => `at://${ALICE}/blue.moji.collection.item/${rkey}`;

// ---- validateApply
{
  const now = new Date("2026-10-18T12:00:00.000Z");
  const ok = validateApply(
    { uri: item("blobcat"), val: "bluemoji-takedown", reason: "  spam  " },
    now,
  );
  assert.deepEqual(ok, {
    uri: item("blobcat"),
    val: "bluemoji-takedown",
    neg: false,
    exp: undefined,
    reason: "spam",
  });
  assert.equal(validateApply({ uri: item("x"), val: "bluemoji-adult", neg: true }, now).neg, true);
  assert.equal(
    validateApply({ uri: item("x"), val: "bluemoji-adult", exp: "2026-11-01T00:00:00Z" }, now).exp,
    "2026-11-01T00:00:00.000Z",
  );

  const bad: [object, RegExp][] = [
    [{ uri: ALICE, val: "bluemoji-takedown" }, /emoji record/],
    [{ uri: `at://${ALICE}/blue.moji.packs.pack/p`, val: "bluemoji-takedown" }, /emoji record/],
    [{ uri: `at://${ALICE}/app.bsky.feed.post/p`, val: "bluemoji-takedown" }, /emoji record/],
    [{ uri: "javascript:alert(1)", val: "bluemoji-takedown" }, /emoji record/],
    [{ uri: item("x"), val: "!takedown" }, /must be one of/],
    [{ uri: item("x"), val: "spam" }, /must be one of/],
    [{ uri: item("x"), val: "bluemoji-adult", exp: "2020-01-01T00:00:00Z" }, /future/],
    [{ uri: item("x"), val: "bluemoji-adult", exp: "soon" }, /datetime/],
    [{ uri: item("x"), val: "bluemoji-adult", neg: true, exp: "2027-01-01T00:00:00Z" }, /lifted/],
  ];
  for (const [input, re] of bad) {
    assert.throws(
      () => validateApply(input as never, now),
      (e: unknown) => e instanceof LabelInputError && re.test((e as Error).message),
      JSON.stringify(input),
    );
  }
}
console.log(
  "ok - applyLabel input: only emoji records and known values, future expiry, no expiry on a lift",
);

// ---- effects against a real database
const sqlite = new Database(":memory:");
const expand = (sql: string, params: unknown[] = []) => {
  const values: unknown[] = [];
  const text = sql.replace(/\$(\d+)/g, (_, n) => (values.push(params[Number(n) - 1]), "?"));
  return { text, values };
};
const db: LabelDb = {
  query: async (sql, params) => {
    const { text, values } = expand(sql, params);
    return sqlite.prepare(text).all(...values) as unknown[];
  },
  run: async (sql, params) => {
    const { text, values } = expand(sql, params);
    sqlite.prepare(text).run(...values);
  },
};
const keypair = await Secp256k1Keypair.create({ exportable: true });
const config = { did: SRC, signingKeyHex: Buffer.from(await keypair.export()).toString("hex") };
const T0 = new Date("2026-10-18T12:00:00.000Z");
const at = (m: number) => new Date(T0.getTime() + m * 60_000);

// The labeler is off: no table, nothing labelled, and no error
resetLabelEffectsCache();
assert.equal((await labelStates(db.query, [item("a")], at(0))).size, 0);
assert.deepEqual([...(await takendownItemUris(db.query, [item("a")]))], []);
assert.deepEqual(await withoutTakenDownItems(db.query, [{ uri: item("a") }], (r) => r.uri), [
  { uri: item("a") },
]);
console.log("ok - with the labeler off (no table) nothing is labelled and nothing errors");

await ensureLabelTable(db);
await ensureLabelTable(db); // idempotent, including the migration
resetLabelEffectsCache();
await appendLabel(
  db,
  config,
  keypair,
  { uri: item("a"), val: "bluemoji-takedown", appliedBy: "did:plc:admin", reason: "spam" },
  at(1),
);
await appendLabel(db, config, keypair, { uri: item("b"), val: "bluemoji-adult" }, at(2));
await appendLabel(db, config, keypair, { uri: item("c"), val: "bluemoji-abusive" }, at(3)); // published, but no local effect
await appendLabel(db, config, keypair, { uri: item("d"), val: "bluemoji-takedown" }, at(4));
await appendLabel(
  db,
  config,
  keypair,
  { uri: item("d"), val: "bluemoji-takedown", neg: true },
  at(5),
); // lifted
await appendLabel(
  db,
  config,
  keypair,
  { uri: item("e"), val: "bluemoji-takedown", exp: at(50).toISOString() },
  at(6),
);

{
  const s = await labelStates(db.query, ["a", "b", "c", "d", "e", "f"].map(item), at(10));
  assert.deepEqual([...s.get(item("a"))!], ["bluemoji-takedown"]);
  assert.deepEqual([...s.get(item("b"))!], ["bluemoji-adult"]);
  assert.equal(s.has(item("c")), false, "abusive/impersonation are published, not enforced here");
  assert.equal(s.has(item("d")), false, "a lifted takedown no longer applies");
  assert.deepEqual([...s.get(item("e"))!], ["bluemoji-takedown"], "before it expires");
  assert.equal(s.has(item("f")), false);
  assert.equal(
    (await labelStates(db.query, [item("e")], at(60))).has(item("e")),
    false,
    "after it expires",
  );
  assert.equal((await labelStates(db.query, [], at(10))).size, 0);
}
console.log(
  "ok - effective labels: latest wins, lifted and expired don't apply, only takedown and adult are enforced",
);

{
  const rows = ["a", "b", "d"].map((k) => ({ uri: item(k), k }));
  const shown = await withoutTakenDownItems(db.query, rows, (r) => r.uri);
  assert.deepEqual(
    shown.map((r) => r.k),
    ["b", "d"],
  );
}
console.log("ok - taken-down emoji are dropped from lists");

{
  const row = sqlite
    .prepare(
      `SELECT applied_by, reason FROM moderation_labels WHERE uri = ? AND val = 'bluemoji-takedown'`,
    )
    .get(item("a")) as any;
  assert.deepEqual(row, { applied_by: "did:plc:admin", reason: "spam" });
}
console.log("ok - who applied a label and why is kept for the audit trail");

// ---- the blob allow-list honours item takedowns
{
  sqlite.exec(`
    CREATE TABLE "blue.moji.collection.item" (uri TEXT, did TEXT, formats TEXT NOT NULL, sticker_formats TEXT);
    CREATE TABLE "blue.moji.packs.pack" (uri TEXT, did TEXT, icon TEXT);
  `);
  const ins = sqlite.prepare(`INSERT INTO "blue.moji.collection.item" VALUES (?, ?, ?, NULL)`);
  const fmt = (cid: string) => JSON.stringify({ png_128: { ref: { $link: cid } } });
  const TAKEN = "bafkreitakentakentakentakentakentakentakentakentakentakentaken";
  const LIVE = "bafkreiliveliveliveliveliveliveliveliveliveliveliveliveliveli";
  const SHARED = "bafkreishareshareshareshareshareshareshareshareshareshareshare";
  ins.run(item("a"), ALICE, fmt(TAKEN)); // taken down
  ins.run(item("b"), ALICE, fmt(LIVE)); // fine (only adult-labelled)
  ins.run(item("a"), ALICE, fmt(SHARED)); // taken down...
  ins.run(item("f"), ALICE, fmt(SHARED)); // ...but another live emoji uses the same blob

  assert.equal(
    await blobIsReferenced(db.query, ALICE, TAKEN),
    false,
    "a taken-down emoji's blob is no longer served",
  );
  assert.equal(await blobIsReferenced(db.query, ALICE, LIVE), true);
  assert.equal(
    await blobIsReferenced(db.query, ALICE, SHARED),
    true,
    "a live emoji sharing the blob keeps it",
  );
}
console.log("ok - /img stops serving the blobs of a taken-down emoji");
console.log("label effects tests passed");
