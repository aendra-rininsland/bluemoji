import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {
  appendLabel,
  ensureLabelTable,
  keypairFromHex,
  labelerConfigFromEnv,
  queryLabels,
  reconcileTakedowns,
  signLabel,
  unsignedBytes,
  verifyLabel,
  type Label,
  type LabelDb,
} from "./_labeler.ts";
import { Secp256k1Keypair } from "@atproto/crypto";
import { cborEncode } from "@atproto/common";

const SRC = "did:plc:mmmmmmmmmmmmmmmmmmmmmmmm";
const ALICE = "did:plc:aaaaaaaaaaaaaaaaaaaaaaaa";
const BOB = "did:plc:bbbbbbbbbbbbbbbbbbbbbbbb";
const ITEM = `at://${ALICE}/blue.moji.collection.item/blobcat`;

const keypair = await Secp256k1Keypair.create({ exportable: true });
const hex = Buffer.from(await keypair.export()).toString("hex");
const config = { did: SRC, signingKeyHex: hex };
const base: Label = {
  ver: 1,
  src: SRC,
  uri: ITEM,
  val: "bluemoji-adult",
  cts: "2026-10-18T12:00:00.000Z",
};

// ---- config
assert.equal(labelerConfigFromEnv({}), null);
assert.equal(labelerConfigFromEnv({ LABELER_DID: SRC }), null, "no key");
assert.equal(labelerConfigFromEnv({ LABELER_DID: SRC, LABELER_SIGNING_KEY: "nothex" }), null);
assert.equal(
  labelerConfigFromEnv({ LABELER_DID: "alice.test", LABELER_SIGNING_KEY: hex }),
  null,
  "not a DID",
);
assert.deepEqual(labelerConfigFromEnv({ LABELER_DID: SRC, LABELER_SIGNING_KEY: hex }), config);
console.log("ok - the labeler is enabled only with a valid DID and signing key");

// ---- signatures
{
  const imported = await keypairFromHex(hex);
  assert.equal(imported.did(), keypair.did(), "the key round-trips through its hex form");
  const signed = await signLabel(base, keypair);
  assert.ok(signed.sig && signed.sig.length === 64);
  assert.equal(await verifyLabel(signed, keypair.did()), true);

  for (const tamper of [
    { val: "bluemoji-takedown" },
    { uri: `${ITEM}2` },
    { cts: "2026-10-19T00:00:00.000Z" },
    { neg: true },
    { src: BOB },
    { cid: "bafyreix" },
    { exp: "2027-01-01T00:00:00.000Z" },
  ] as Partial<Label>[]) {
    assert.equal(
      await verifyLabel({ ...signed, ...tamper }, keypair.did()),
      false,
      JSON.stringify(tamper),
    );
  }
  const other = await Secp256k1Keypair.create();
  assert.equal(await verifyLabel(signed, other.did()), false, "someone else's key");
  assert.equal(await verifyLabel({ ...signed, sig: undefined }, keypair.did()), false);
  assert.equal(await verifyLabel({ ...signed, sig: new Uint8Array(64) }, keypair.did()), false);
}
console.log(
  "ok - labels verify against the labeler's key, and any change to a label breaks the signature",
);

{
  // The signed bytes don't depend on how absent fields are spelled
  assert.deepEqual(
    unsignedBytes({ ...base, neg: false }),
    unsignedBytes(base),
    "neg:false is the same as absent",
  );
  assert.deepEqual(unsignedBytes({ ...base, cid: undefined, exp: undefined }), unsignedBytes(base));
  assert.notDeepEqual(unsignedBytes({ ...base, neg: true }), unsignedBytes(base));
  // and they are exactly the DAG-CBOR of the label's fields, built independently here
  assert.deepEqual(
    unsignedBytes(base),
    cborEncode({
      ver: 1,
      src: SRC,
      uri: ITEM,
      val: "bluemoji-adult",
      cts: "2026-10-18T12:00:00.000Z",
    }),
  );
  assert.deepEqual(
    unsignedBytes({ ...base, cid: "bafyreix", neg: true, exp: "2027-01-01T00:00:00.000Z" }),
    cborEncode({
      ver: 1,
      src: SRC,
      uri: ITEM,
      cid: "bafyreix",
      val: "bluemoji-adult",
      neg: true,
      cts: "2026-10-18T12:00:00.000Z",
      exp: "2027-01-01T00:00:00.000Z",
    }),
  );
}
console.log("ok - the signed bytes are canonical (neg only when true, absent fields omitted)");

// ---- storage + queryLabels
const sqlite = new Database(":memory:");
sqlite.exec(`CREATE TABLE _repos (did TEXT PRIMARY KEY, status TEXT)`);
const expand = (sql: string, params: unknown[] = []) => {
  const values: unknown[] = [];
  const text = sql.replace(/\$(\d+)/g, (_, n) => {
    values.push(params[Number(n) - 1]);
    return "?";
  });
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
await ensureLabelTable(db);
await ensureLabelTable(db); // idempotent

const T0 = new Date("2026-10-18T12:00:00.000Z");
const at = (m: number) => new Date(T0.getTime() + m * 60_000);
const q = (patterns: string[], extra: object = {}, now = at(100)) =>
  queryLabels(db, SRC, { patterns, ...extra }, now);

await appendLabel(db, config, keypair, { uri: ITEM, val: "bluemoji-adult" }, T0);
await appendLabel(db, config, keypair, { uri: ALICE, val: "bluemoji-takedown" }, at(1));
await appendLabel(
  db,
  config,
  keypair,
  { uri: `at://${BOB}/blue.moji.collection.item/x`, val: "bluemoji-abusive" },
  at(2),
);

{
  const r = await q([ITEM]);
  assert.equal(r.labels.length, 1);
  const w = r.labels[0];
  assert.equal(w.src, SRC);
  assert.equal(w.ver, 1);
  assert.equal(w.val, "bluemoji-adult");
  assert.ok(!("neg" in w), "neg only when true");
  // A consumer can rebuild the label from the wire form and verify it
  const rebuilt: Label = {
    ver: 1,
    src: w.src,
    uri: w.uri,
    val: w.val,
    cts: w.cts,
    sig: Uint8Array.from(Buffer.from(w.sig.$bytes, "base64")),
  };
  assert.equal(await verifyLabel(rebuilt, keypair.did()), true);
  assert.equal(await verifyLabel({ ...rebuilt, val: "bluemoji-takedown" }, keypair.did()), false);
}
console.log("ok - queryLabels returns the wire form, and a consumer can verify it from that alone");

{
  assert.equal((await q([ALICE])).labels.length, 1, "an account label, by DID");
  assert.equal((await q([`at://${ALICE}/*`])).labels.length, 1, "prefix pattern");
  assert.equal((await q([`at://*`])).labels.length, 2, "broad prefix");
  assert.equal((await q([ALICE, ITEM])).labels.length, 2, "several patterns are OR-ed");
  assert.equal((await q([`at://${BOB}/blue.moji.collection.item/y`])).labels.length, 0);
  assert.equal((await q([])).labels.length, 0);
  assert.equal((await q([ITEM], { sources: [SRC] })).labels.length, 1);
  assert.equal(
    (await q([ITEM], { sources: [BOB] })).labels.length,
    0,
    "someone else's labels aren't ours to return",
  );
  // LIKE wildcards in a pattern are literal
  assert.equal((await q([`at://%`])).labels.length, 0);
  assert.equal((await q([`at://_____`])).labels.length, 0);
}
console.log("ok - patterns: exact, prefix, OR, sources, and no LIKE wildcard injection");

{
  await appendLabel(db, config, keypair, { uri: ITEM, val: "bluemoji-adult", neg: true }, at(10));
  const r = await q([ITEM]);
  assert.equal(r.labels.length, 1, "only the current label for a (uri, val)");
  assert.equal(
    (r.labels[0] as any).neg,
    true,
    "which is the negation, so the consumer sees it lifted",
  );
}
console.log("ok - only the latest label per (uri, val) is returned; a negation shows as lifted");

{
  await appendLabel(
    db,
    config,
    keypair,
    {
      uri: `at://${ALICE}/blue.moji.collection.item/temp`,
      val: "bluemoji-abusive",
      exp: at(50).toISOString(),
    },
    at(20),
  );
  const target = `at://${ALICE}/blue.moji.collection.item/temp`;
  assert.equal((await q([target], {}, at(30))).labels.length, 1);
  assert.equal((await q([target], {}, at(60))).labels.length, 0, "expired");
}
console.log("ok - expired labels are not returned");

{
  const all = await q([`at://*`, ALICE]);
  assert.ok(all.labels.length >= 3);
  const first = await q([`at://*`, ALICE], { limit: 2 });
  assert.equal(first.labels.length, 2);
  assert.ok(first.cursor);
  const second = await q([`at://*`, ALICE], { limit: 2, cursor: first.cursor });
  const seen = [...first.labels, ...second.labels].map((l) => `${l.uri}|${l.val}`);
  assert.equal(new Set(seen).size, seen.length, "no repeats across pages");
  assert.equal(
    (await q([`at://*`], { limit: 0 })).labels.length >= 1,
    true,
    "limit is clamped to at least 1",
  );
  assert.ok((await q([`at://*`], { limit: 9999 })).labels.length <= 250);
}
console.log("ok - cursor pagination");

// ---- takedown sync
{
  const set = (did: string, status: string) =>
    sqlite
      .prepare(
        `INSERT INTO _repos (did, status) VALUES (?, ?) ON CONFLICT(did) DO UPDATE SET status = excluded.status`,
      )
      .run(did, status);
  const takedown = async (uri: string) =>
    (await q([uri])).labels.find((l) => l.val === "bluemoji-takedown");

  set(BOB, "active");
  set(ALICE, "takendown"); // ALICE already has an admin-origin takedown label from above
  let r = await reconcileTakedowns(db, config, keypair, at(200));
  assert.deepEqual(
    r,
    { labelled: [], lifted: [] },
    "an account a person already labelled is left alone",
  );

  const CARL = "did:plc:cccccccccccccccccccccccc";
  set(CARL, "takendown");
  r = await reconcileTakedowns(db, config, keypair, at(201));
  assert.deepEqual(r, { labelled: [CARL], lifted: [] });
  assert.ok(await takedown(CARL));
  assert.deepEqual(
    await reconcileTakedowns(db, config, keypair, at(202)),
    { labelled: [], lifted: [] },
    "idempotent",
  );

  set(CARL, "active"); // reinstated
  r = await reconcileTakedowns(db, config, keypair, at(203));
  assert.deepEqual(r, { labelled: [], lifted: [CARL] });
  assert.equal(((await takedown(CARL)) as any).neg, true);
  assert.deepEqual(await reconcileTakedowns(db, config, keypair, at(204)), {
    labelled: [],
    lifted: [],
  });

  set(CARL, "takendown"); // and taken down again
  r = await reconcileTakedowns(db, config, keypair, at(205));
  assert.deepEqual(r, { labelled: [CARL], lifted: [] });
  assert.equal(((await takedown(CARL)) as any).neg, undefined);

  // A person lifted a takedown by hand while hatk still says takendown: status sync must not re-apply it
  const DAVE = "did:plc:dddddddddddddddddddddddd";
  await appendLabel(db, config, keypair, { uri: DAVE, val: "bluemoji-takedown" }, at(210));
  await appendLabel(
    db,
    config,
    keypair,
    { uri: DAVE, val: "bluemoji-takedown", neg: true },
    at(211),
  );
  set(DAVE, "takendown");
  r = await reconcileTakedowns(db, config, keypair, at(212));
  assert.deepEqual(r.labelled, [], "a hand-lifted label stays lifted");
  assert.equal(((await takedown(DAVE)) as any).neg, true);

  set(ALICE, "active"); // reinstated in hatk, but a person's label is theirs to lift
  r = await reconcileTakedowns(db, config, keypair, at(206));
  assert.deepEqual(r.lifted, [], "a hand-applied label isn't undone by status sync");
  assert.ok(await takedown(ALICE));
}
console.log(
  "ok - takedowns and reinstatements are published as labels; hand-applied ones are left alone",
);
console.log("labeler tests passed");
