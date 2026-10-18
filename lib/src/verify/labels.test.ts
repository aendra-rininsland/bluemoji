import test from "node:test";
import assert from "node:assert";
import { Secp256k1Keypair } from "@atproto/crypto";
import { cborEncode } from "@atproto/common";
import {
  clearLabelCaches,
  encodeLabel,
  verifyEmojiClaim,
  verifyLabelSignature,
  type WireLabel,
} from "./index";
import { render } from "../render/index";

const DID = "did:plc:abcdefghijklmnopqrstuvwx";
const MOD = "did:plc:mmmmmmmmmmmmmmmmmmmmmmmm";
const PDS = "https://pds.example";
const LABELER = "https://labeler.example";
const ITEM_URI = `at://${DID}/blue.moji.collection.item/blobcat`;

const keypair = await Secp256k1Keypair.create();
const otherKey = await Secp256k1Keypair.create();
const T = "2026-10-18T12:00:00.000Z";
const later = "2026-10-18T13:00:00.000Z";

const unsigned = (over: Partial<WireLabel> = {}): WireLabel => ({
  ver: 1,
  src: MOD,
  uri: ITEM_URI,
  val: "bluemoji-takedown",
  cts: T,
  ...over,
});
/** Sign with the *reference* encoder, independently of the lib's. */
async function sign(label: WireLabel, key = keypair): Promise<WireLabel> {
  const { sig: _s, ...rest } = label;
  const obj: Record<string, unknown> = {
    ver: 1,
    src: rest.src,
    uri: rest.uri,
    val: rest.val,
    cts: rest.cts,
  };
  if (rest.cid) obj.cid = rest.cid;
  if (rest.neg === true) obj.neg = true;
  if (rest.exp) obj.exp = rest.exp;
  const sig = await key.sign(cborEncode(obj));
  return { ...label, sig: { $bytes: Buffer.from(sig).toString("base64") } };
}

test("encodeLabel matches the reference DAG-CBOR encoder byte for byte", () => {
  const long = `at://${DID}/blue.moji.collection.item/${"x".repeat(300)}`; // forces a 2-byte string head
  const shapes: WireLabel[] = [
    unsigned(),
    unsigned({ neg: true }),
    unsigned({ neg: false }),
    unsigned({ cid: "bafyreigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", exp: later }),
    unsigned({ uri: DID }),
    unsigned({ uri: long }),
    unsigned({
      uri: `at://${DID}/blue.moji.collection.item/xn--wgv71a119e`,
      val: "bluemoji-adult",
    }),
    unsigned({ val: "é".repeat(20) }),
  ];
  for (const l of shapes) {
    const obj: Record<string, unknown> = { ver: 1, src: l.src, uri: l.uri, val: l.val, cts: l.cts };
    if (l.cid) obj.cid = l.cid;
    if (l.neg === true) obj.neg = true;
    if (l.exp) obj.exp = l.exp;
    assert.deepEqual(
      Buffer.from(encodeLabel(l)),
      Buffer.from(cborEncode(obj)),
      JSON.stringify(l).slice(0, 80),
    );
  }
});

test("a reference-signed label verifies, and any change breaks it", async () => {
  const l = await sign(unsigned());
  assert.equal(await verifyLabelSignature(l, keypair.did()), true);
  for (const t of [
    { val: "bluemoji-adult" },
    { uri: DID },
    { cts: later },
    { neg: true },
    { src: DID },
    { exp: later },
    { cid: "bafyreix" },
  ] as Partial<WireLabel>[]) {
    assert.equal(
      await verifyLabelSignature({ ...l, ...t }, keypair.did()),
      false,
      JSON.stringify(t),
    );
  }
  assert.equal(await verifyLabelSignature(l, otherKey.did()), false);
  assert.equal(await verifyLabelSignature({ ...l, sig: undefined }, keypair.did()), false);
  assert.equal(await verifyLabelSignature({ ...l, sig: { $bytes: "***" } }, keypair.did()), false);
});

// ---------------------------------------------------------------- the world
const record = {
  $type: "blue.moji.collection.item",
  name: ":blobcat:",
  alt: "a cat",
  adultOnly: false,
  formats: {
    $type: "blue.moji.collection.item#formats_v1",
    png_128: { $type: "blob", ref: { $link: "bafkreiaaa" }, mimeType: "image/png", size: 1 },
  },
};
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });

type World = {
  labels?: (subject: string) => WireLabel[] | Response;
  labelerDid?: object;
  labelerBroken?: boolean;
};
function world(w: World = {}) {
  const seen: string[] = [];
  const didDoc = w.labelerDid ?? {
    service: [{ id: "#atproto_labeler", type: "AtprotoLabeler", serviceEndpoint: LABELER }],
    verificationMethod: [
      {
        id: "#atproto_label",
        type: "Multikey",
        controller: MOD,
        publicKeyMultibase: keypair.did().slice("did:key:".length),
      },
    ],
  };
  const fetch = (async (input: any) => {
    const url = new URL(String(input));
    seen.push(url.href);
    if (url.origin === "https://plc.directory") {
      if (url.pathname === `/${MOD}`)
        return w.labelerBroken ? new Response("", { status: 404 }) : json(didDoc);
      return json({ service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: PDS }] });
    }
    if (url.origin === PDS && url.pathname.endsWith("getRecord"))
      return json({ uri: ITEM_URI, cid: "bafyreirec", value: record });
    if (url.origin === LABELER && url.pathname.endsWith("queryLabels")) {
      const r = w.labels?.(url.searchParams.get("uriPatterns")!) ?? [];
      return r instanceof Response ? r : json({ labels: r });
    }
    return new Response("{}", { status: 404 });
  }) as typeof globalThis.fetch;
  return { fetch, seen };
}
const claim = { did: DID, name: ":blobcat:" };
const labelsFor =
  (uri: string, ...ls: WireLabel[]) =>
  (s: string) =>
    s === uri ? ls : [];
const withLabelers = (w: ReturnType<typeof world>, extra: object = {}) => ({
  fetch: w.fetch,
  labelers: [MOD],
  labelCacheTtlMs: 0,
  ...extra,
});
test.beforeEach(() => clearLabelCaches());

test("with no labelers listed, nothing is asked of any labeler", async () => {
  const w = world({ labels: () => [] });
  const r = await verifyEmojiClaim(claim, { fetch: w.fetch });
  assert.equal(r?.labels, undefined);
  assert.ok(!w.seen.some((u) => u.includes("queryLabels")));
});

test("a signed takedown on the emoji makes it unverifiable", async () => {
  const w = world({ labels: labelsFor(ITEM_URI, await sign(unsigned())) });
  assert.equal(await verifyEmojiClaim(claim, withLabelers(w)), null);
});

test("a signed takedown on the owner's account makes every emoji of theirs unverifiable", async () => {
  const w = world({ labels: labelsFor(DID, await sign(unsigned({ uri: DID }))) });
  assert.equal(await verifyEmojiClaim(claim, withLabelers(w)), null);
});

test("an adult label forces adultOnly even though the record says false", async () => {
  const w = world({ labels: labelsFor(ITEM_URI, await sign(unsigned({ val: "bluemoji-adult" }))) });
  const r = await verifyEmojiClaim(claim, withLabelers(w));
  assert.equal(r?.item.adultOnly, true);
  assert.deepEqual(r?.labels, ["bluemoji-adult"]);
  assert.equal(
    r?.moderated,
    true,
    "a labeler was consulted, so this is moderated even from the PDS",
  );
  assert.deepEqual(r?.labelers, { consulted: [MOD], unavailable: [] });
});

test("a negation later than the label lifts it; an earlier one does not", async () => {
  const lifted = world({
    labels: labelsFor(
      ITEM_URI,
      await sign(unsigned()),
      await sign(unsigned({ neg: true, cts: later })),
    ),
  });
  assert.ok(await verifyEmojiClaim(claim, withLabelers(lifted)), "lifted");
  const stale = world({
    labels: labelsFor(
      ITEM_URI,
      await sign(unsigned({ cts: later })),
      await sign(unsigned({ neg: true, cts: T })),
    ),
  });
  assert.equal(
    await verifyEmojiClaim(claim, withLabelers(stale)),
    null,
    "the negation was older than the label",
  );
});

test("an expired label does not apply", async () => {
  const w = world({
    labels: labelsFor(ITEM_URI, await sign(unsigned({ exp: "2020-01-01T00:00:00.000Z" }))),
  });
  assert.ok(await verifyEmojiClaim(claim, withLabelers(w)));
});

test("labels from another source, or about another subject, are ignored", async () => {
  const w = world({
    labels: () => [] as WireLabel[],
  });
  const elsewhere = world({
    labels: (s) => (s === ITEM_URI ? [] : []),
  });
  assert.ok(await verifyEmojiClaim(claim, withLabelers(w)));
  assert.ok(await verifyEmojiClaim(claim, withLabelers(elsewhere)));
  const impostor = await sign(unsigned({ src: DID })); // claims to be someone else
  const w2 = world({ labels: labelsFor(ITEM_URI, impostor) });
  assert.ok(await verifyEmojiClaim(claim, withLabelers(w2)), "a label whose src isn't the labeler");
  const other = await sign(unsigned({ uri: `at://${DID}/blue.moji.collection.item/othercat` }));
  const w3 = world({ labels: () => [other] });
  assert.ok(await verifyEmojiClaim(claim, withLabelers(w3)), "a label about a different emoji");
});

test("a forged signature is not believed, and marks the labeler unavailable", async () => {
  const forged = await sign(unsigned(), otherKey); // signed by a key that is not in the DID document
  const w = world({ labels: labelsFor(ITEM_URI, forged) });
  const r = await verifyEmojiClaim(claim, withLabelers(w));
  assert.ok(r, "the forged takedown did not take the emoji down");
  assert.deepEqual(r?.labelers, { consulted: [], unavailable: [MOD] });
  assert.equal(
    await verifyEmojiClaim(claim, withLabelers(w, { labelerFailure: "hide" })),
    null,
    "and fail-closed hosts hide it",
  );
});

test("an unsigned label is not believed", async () => {
  const w = world({ labels: labelsFor(ITEM_URI, unsigned()) });
  const r = await verifyEmojiClaim(claim, withLabelers(w));
  assert.ok(r);
  assert.deepEqual(r?.labelers?.unavailable, [MOD]);
});

test("an unreachable labeler is skipped by default, or hides the emoji if asked", async () => {
  const down = world({ labels: () => new Response("boom", { status: 503 }) });
  const r = await verifyEmojiClaim(claim, withLabelers(down));
  assert.ok(r);
  assert.deepEqual(r?.labelers, { consulted: [], unavailable: [MOD] });
  assert.equal(r?.moderated, false, "nothing moderated this answer");
  assert.equal(await verifyEmojiClaim(claim, withLabelers(down, { labelerFailure: "hide" })), null);
  clearLabelCaches(); // a labeler's DID document is cached for an hour
  const noDoc = world({ labelerBroken: true });
  assert.deepEqual((await verifyEmojiClaim(claim, withLabelers(noDoc)))?.labelers?.unavailable, [
    MOD,
  ]);
  clearLabelCaches();
  const noKey = world({
    labelerDid: { service: [{ id: "#atproto_labeler", serviceEndpoint: LABELER }] },
  });
  assert.deepEqual((await verifyEmojiClaim(claim, withLabelers(noKey)))?.labelers?.unavailable, [
    MOD,
  ]);
});

test("a pinned labeler needs no DID document", async () => {
  const w = world({ labelerBroken: true, labels: labelsFor(ITEM_URI, await sign(unsigned())) });
  const r = await verifyEmojiClaim(
    claim,
    withLabelers(w, { labelers: [{ did: MOD, endpoint: LABELER, key: keypair.did() }] }),
  );
  assert.equal(r, null);
  assert.ok(!w.seen.some((u) => u.includes(`/${MOD}`)), "its DID document was never fetched");
});

test("a labeler endpoint that isn't https is refused", async () => {
  const w = world({
    labelerDid: {
      service: [{ id: "#atproto_labeler", serviceEndpoint: "http://labeler.example" }],
      verificationMethod: [{ id: "#atproto_label", publicKeyMultibase: keypair.did().slice(8) }],
    },
  });
  const r = await verifyEmojiClaim(claim, withLabelers(w));
  assert.deepEqual(r?.labelers?.unavailable, [MOD]);
  assert.ok(!w.seen.some((u) => u.startsWith("http://")));
});

test("answers are cached briefly, and the cache can be turned off", async () => {
  const w = world({ labels: () => [] });
  const opts = { fetch: w.fetch, labelers: [MOD] };
  await verifyEmojiClaim(claim, opts);
  const first = w.seen.filter((u) => u.includes("queryLabels")).length;
  await verifyEmojiClaim(claim, opts);
  assert.equal(
    w.seen.filter((u) => u.includes("queryLabels")).length,
    first,
    "second call served from the cache",
  );
  clearLabelCaches();
  await verifyEmojiClaim(claim, { ...opts, labelCacheTtlMs: 0 });
  await verifyEmojiClaim(claim, { ...opts, labelCacheTtlMs: 0 });
  assert.ok(
    w.seen.filter((u) => u.includes("queryLabels")).length >= first + 4,
    "ttl 0 asks every time",
  );
});

test("render hides abusive/impersonation emoji unless told otherwise", async () => {
  (globalThis as any).document ??= { createElement: () => ({ setAttribute() {} }) };
  const w = world({
    labels: labelsFor(ITEM_URI, await sign(unsigned({ val: "bluemoji-abusive" }))),
  });
  const verify = { labelers: [MOD], labelCacheTtlMs: 0 };
  assert.equal(await render(null, claim as any, { fetch: w.fetch, verify }), undefined);
  assert.ok(await render(null, claim as any, { fetch: w.fetch, verify, showLabelled: true }));
  const takedown = world({ labels: labelsFor(ITEM_URI, await sign(unsigned())) });
  assert.equal(
    await render(null, claim as any, { fetch: takedown.fetch, verify, showLabelled: true }),
    undefined,
    "takedown can't be overridden",
  );
});
