// Runs the real pack OG handler against a fake database and PDS.
import assert from "node:assert/strict";
import { canRender } from "./_card-text.ts";
import pack from "./pack.ts";
import { setGuardedFetchForTests } from "../../app/lib/server/safe-fetch.ts";

process.env.PLC_DIRECTORY_URL = "https://plc.directory"; // dev would use the local PLC

// These tests stub globalThis.fetch; route the guarded fetch through whatever it is now
setGuardedFetchForTests(((...args: Parameters<typeof fetch>) =>
  globalThis.fetch(...args)) as typeof fetch);

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGNkYPj/nwEPYMInOXwUAAAQXQIOZWZ6QQAAAABJRU5ErkJggg==",
  "base64",
);
const SVG = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>");
const DID = "did:plc:kmzpsik7s5y5fwu7nnkngfx4";
const OTHER = "did:plc:yanjws2jfuo2ec6ni6bq3njs";
const RKEY = "3mxkh3kt5mh2t";
const PACK_URI = `at://${DID}/blue.moji.packs.pack/${RKEY}`;

interface Item {
  n: number;
  did?: string;
  adult?: boolean;
  png?: boolean;
  blobType?: "png" | "svg";
}
function ctxFor(
  packRow: Record<string, unknown>,
  items: Item[],
  opts: { takendown?: string[] } = {},
) {
  const rows = items.map((i) => ({
    uri: `at://${i.did ?? DID}/blue.moji.collection.item/e${i.n}`,
    did: i.did ?? DID,
    adult_only: i.adult ? 1 : 0,
    formats:
      i.png === false
        ? JSON.stringify({ webp_128: { ref: { $link: "bafkreiwebp" } } })
        : JSON.stringify({ png_128: { ref: { $link: `bafkreie${i.n}${i.blobType ?? "png"}` } } }),
  }));
  const down = new Set(opts.takendown ?? []);
  return {
    params: { handle: DID, rkey: RKEY },
    db: {
      query: async (sql: string) => {
        if (sql.includes('FROM "blue.moji.packs.pack"'))
          return [
            {
              uri: PACK_URI,
              did: DID,
              created_at: "x",
              icon: null,
              adult_only: 0,
              description: null,
              ...packRow,
            },
          ];
        if (sql.includes("FROM _repos")) return [{ did: DID, handle: "moji.blue" }];
        if (sql.includes('"blue.moji.packs.packitem"'))
          return rows.map((r) => ({ subject: r.uri }));
        if (sql.includes('"blue.moji.collection.item"')) return rows;
        return [];
      },
    },
    count: async () => new Map([[PACK_URI, items.length]]),
    isTakendown: async (d: string) => down.has(d),
    filterTakendownDids: async (dids: string[]) => new Set(dids.filter((d) => down.has(d))),
  } as any;
}

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any) => {
  const url = String(input);
  if (url.startsWith("https://plc.directory/"))
    return new Response(
      JSON.stringify({
        service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: "https://pds.example" }],
      }),
    );
  if (url.startsWith("https://pds.example/xrpc/com.atproto.sync.getBlob")) {
    const cid = new URL(url).searchParams.get("cid")!;
    if (cid.endsWith("svg"))
      return new Response(SVG, { headers: { "content-type": "image/svg+xml" } });
    if (cid.startsWith("bafkreie"))
      return new Response(PNG, { headers: { "content-type": "image/png" } });
  }
  return new Response("nope", { status: 404 });
}) as typeof fetch;

// ---- walk the element tree
type Node = { type: string; props: { children?: any; src?: string } };
const kids = (n: Node): any[] =>
  [n.props.children].flat().filter((c) => c !== undefined && c !== null && c !== false);
function walk(n: any, visit: (n: Node) => void) {
  if (typeof n === "string") return;
  visit(n);
  for (const c of kids(n)) walk(c, visit);
}
const texts = (el: Node) => {
  const out: string[] = [];
  walk(el, (n) => kids(n).forEach((c) => typeof c === "string" && out.push(c)));
  return out;
};
const images = (el: Node) => {
  const out: Node[] = [];
  walk(el, (n) => n.type === "img" && out.push(n));
  return out;
};
const render = async (packRow: Record<string, unknown>, items: Item[], opts = {}) =>
  (await pack.generate(ctxFor(packRow, items, opts))).element as Node;

// 1. the invariant behind the "NO GLYPH" bug: every character on the card is drawable
const nasty = "🔥 Fire 火 Pride 🏳️‍🌈 Ünïcode ☃ Привет";
const el1 = await render({ name: nasty, description: "日本語 🎉 العربية Ελληνικά text" }, [
  { n: 1 },
]);
for (const t of texts(el1))
  for (const ch of t)
    assert.ok(
      canRender(ch.codePointAt(0)!) || ch === " ",
      `unrenderable ${JSON.stringify(ch)} in ${JSON.stringify(t)}`,
    );
assert.ok(texts(el1).includes("Fire Pride Ünïcode"), JSON.stringify(texts(el1)));
console.log("ok - no text on the card needs a glyph the font lacks");

// 2. the 📦 placeholder is gone: no icon and no emoji means no tile and no text glyphs at all
const bare = await render({ name: "Plain" }, []);
assert.ok(!texts(bare).some((t) => t.includes("📦")));
assert.equal(images(bare).length, 0);
console.log("ok - an empty pack shows no placeholder glyph");

// 3. falls back when nothing printable is left
assert.ok(texts(await render({ name: "猫の絵文字" }, [])).includes("Bluemoji pack"));
console.log("ok - a name with nothing drawable falls back to 'Bluemoji pack'");

// 4. real emoji appear, capped at 12, in pack order
const many = await render(
  { name: "Big" },
  Array.from({ length: 30 }, (_, i) => ({ n: i })),
);
assert.equal(images(many).length, 12);
assert.ok(images(many).every((i) => i.props.src!.startsWith("data:image/png;base64,")));
const few = await render({ name: "Few" }, [{ n: 1 }, { n: 2 }, { n: 3 }]);
assert.equal(images(few).length, 3);
console.log("ok - shows up to 12 of the pack's own emoji");

// 5. public preview safety: adult-only packs/items and taken-down owners never appear
assert.equal(
  images(await render({ name: "Spicy", adult_only: 1 }, [{ n: 1 }, { n: 2 }])).length,
  0,
  "adult-only pack shows no emoji",
);
assert.equal(
  images(
    await render({ name: "Mixed" }, [
      { n: 1 },
      { n: 2, adult: true },
      { n: 3 },
      { n: 4, adult: true },
    ]),
  ).length,
  2,
  "adult-only items are skipped",
);
assert.equal(
  images(
    await render({ name: "Mod" }, [{ n: 1 }, { n: 2, did: OTHER }, { n: 3 }], {
      takendown: [OTHER],
    }),
  ).length,
  2,
  "taken-down owners' emoji are skipped",
);
const gone = (await pack.generate(ctxFor({ name: "Gone" }, [{ n: 1 }], { takendown: [DID] })))
  .element as Node;
assert.deepEqual(texts(gone), ["moji.blue"], "a taken-down pack's card is blank");
console.log("ok - adult-only items/packs and taken-down accounts are never shown");

// 6. unusable blobs are skipped, not fatal; failures leave gaps filled from the slack candidates
const mixed = await render({ name: "Mixed blobs" }, [
  { n: 1 },
  { n: 2, blobType: "svg" },
  { n: 3, png: false },
  { n: 4 },
]);
assert.equal(images(mixed).length, 2, "SVG blobs and emoji with no PNG rendition are skipped");
console.log("ok - SVG blobs and emoji without a PNG rendition are skipped");

// 7. the card still renders if the database or network misbehave
const broken = ctxFor({ name: "Resilient" }, [{ n: 1 }]);
const origQuery = broken.db.query;
broken.db.query = async (sql: string, p: any) => {
  if (sql.includes("packitem") && sql.includes("SELECT subject")) throw new Error("db down");
  return origQuery(sql, p);
};
const res = await pack.generate(broken);
assert.equal(images(res.element as Node).length, 0);
assert.ok(texts(res.element as Node).includes("Resilient"));
console.log("ok - a failure fetching emoji degrades to a card without them");

// 8. meta (what link previews show as title/description text) is untouched
const meta = (await pack.generate(ctxFor({ name: "🔥 Fire", description: "日本語" }, []))).meta!;
assert.equal(meta.title, "🔥 Fire — a Bluemoji pack");
assert.equal(meta.description, "日本語");
console.log("ok - the page's og:title/description keep the original text");

globalThis.fetch = realFetch;
console.log("og pack card tests passed");
