import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canRender,
  cardText,
  clip,
  fetchCardImage,
  INTER_RANGES,
  MAX_CARD_IMAGE_BYTES,
} from "./_card-text.ts";

// ---- cardText: nothing it returns may need a glyph the font lacks
const cases: [string, string][] = [
  ["Party Pack", "Party Pack"],
  ["Fire Pride — pride’s “flames”…", "Fire Pride — pride’s “flames”…"],
  ["19 emoji · by @moji.blue", "19 emoji · by @moji.blue"],
  ["Café Ünïcode Ñandú ß ø å", "Café Ünïcode Ñandú ß ø å"],
  ["🔥 Fire 火 Pride 🏳️‍🌈", "Fire Pride"],
  ["Łódź", "Lódz"],
  ["Žluťoučký kůň", "Zlutoucký kun"],
  ["Đorđe Ħamrun", "Dorde Hamrun"],
  ["猫の絵文字", ""],
  ["Привет мир", ""],
  ["Ελληνικά and English", "and English"],
  ["مرحبا Hello", "Hello"],
  ["  lots   of\n\n space\t here ", "lots of space here"],
  ["a‍b​c️", "abc"],
  ["", ""],
];
for (const [input, want] of cases) assert.equal(cardText(input), want, JSON.stringify(input));
assert.equal(cardText(null), "");
assert.equal(cardText(undefined), "");
for (const [input] of cases)
  for (const ch of cardText(input))
    assert.ok(canRender(ch.codePointAt(0)!) || ch === " ", `${JSON.stringify(ch)} is renderable`);
console.log("ok - cardText drops what the font can't draw and folds accented letters");

assert.equal(clip("short", 10), "short");
assert.equal(clip("abcdefghij", 5), "abcd…");
assert.equal(clip("ab cdefg", 4), "ab…", "trims the space before the ellipsis");
console.log("ok - clip");

// ---- the allowlist must match the bundled font exactly (so a font change can't reintroduce NO GLYPH)
const FONT = new URL("../../node_modules/@hatk/hatk/fonts/Inter-Regular.woff", import.meta.url);
let opentype: any = null;
try {
  opentype = (await import("@shuding/opentype.js" as string)).default;
} catch {
  console.log("skip - @shuding/opentype.js not available; allowlist/font check not run");
}
if (opentype) {
  const buf = readFileSync(FONT);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const BLOCKS = [
    [0x20, 0x7e],
    [0xa0, 0x24f],
    [0x370, 0x3ff],
    [0x400, 0x52f],
    [0x1e00, 0x1eff],
    [0x2010, 0x205e],
    [0x20a0, 0x20bf],
    [0x2100, 0x214f],
    [0x2190, 0x21ff],
  ];
  const zeroWidthOrControl = (cp: number) =>
    (cp >= 0x200b && cp <= 0x200f) ||
    (cp >= 0x2028 && cp <= 0x202e) ||
    (cp >= 0x2060 && cp <= 0x206f);
  for (const [a, b] of BLOCKS) {
    for (let cp = a; cp <= b; cp++) {
      const g = font.charToGlyph(String.fromCodePoint(cp));
      const inFont = !!g && g.index !== 0 && !zeroWidthOrControl(cp);
      assert.equal(
        canRender(cp),
        inFont,
        `U+${cp.toString(16)}: allowlist ${canRender(cp)} vs font ${inFont} — regenerate INTER_RANGES`,
      );
    }
  }
  console.log(`ok - INTER_RANGES (${INTER_RANGES.length} ranges) matches the font's glyph table`);
}

// ---- fetchCardImage
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(40),
]);
const mk = (body: Buffer | string, headers: Record<string, string> = {}, status = 200) =>
  (async () => new Response(body as BodyInit, { status, headers })) as typeof fetch;
assert.match(
  (await fetchCardImage("https://x/png", mk(PNG, { "content-type": "image/png" })))!,
  /^data:image\/png;base64,/,
);
assert.match(
  (await fetchCardImage(
    "https://x/jpg",
    mk(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), { "content-type": "image/jpeg" }),
  ))!,
  /^data:image\/jpeg;base64,/,
);
assert.equal(
  await fetchCardImage(
    "https://x/svg",
    mk("<svg xmlns='http://www.w3.org/2000/svg'/>", { "content-type": "image/svg+xml" }),
  ),
  null,
  "SVG is refused",
);
assert.equal(
  await fetchCardImage("https://x/lying", mk("<svg/>", { "content-type": "image/png" })),
  null,
  "type comes from the bytes, not the header",
);
assert.equal(
  await fetchCardImage(
    "https://x/webp",
    mk(Buffer.from("RIFF\0\0\0\0WEBPVP8 "), { "content-type": "image/webp" }),
  ),
  null,
  "WebP can't be drawn",
);
assert.equal(await fetchCardImage("https://x/404", mk("nope", {}, 404)), null);
assert.equal(
  await fetchCardImage(
    "https://x/big",
    mk(Buffer.concat([PNG, Buffer.alloc(MAX_CARD_IMAGE_BYTES)]), { "content-type": "image/png" }),
  ),
  null,
  "over the size cap",
);
assert.equal(
  await fetchCardImage("https://x/err", (async () => {
    throw new Error("boom");
  }) as typeof fetch),
  null,
);
console.log("ok - fetchCardImage accepts only PNG/JPEG by content, with a size cap");
console.log("og card text tests passed");
