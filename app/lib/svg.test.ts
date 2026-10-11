import assert from "node:assert/strict";
import { looksLikeSvg } from "./image.ts";
import { fitSvgSize, parseSvgLength, svgNaturalSize } from "./svg.ts";

// ---- lengths
const near = (a: number | null, b: number) =>
  assert.ok(a !== null && Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);
near(parseSvgLength("64"), 64);
near(parseSvgLength("64px"), 64);
near(parseSvgLength(" 12.5 px "), 12.5);
near(parseSvgLength("1in"), 96);
near(parseSvgLength("72pt"), 96);
near(parseSvgLength("25.4mm"), 96);
near(parseSvgLength("1e2"), 100);
for (const bad of ["100%", "2em", "auto", "", null, undefined, "-5", "0", "abc", "10 20"]) {
  assert.equal(parseSvgLength(bad as any), null, String(bad));
}

// ---- natural size
assert.deepEqual(svgNaturalSize({ width: "64", height: "32" }), { w: 64, h: 32 });
assert.deepEqual(svgNaturalSize({ viewBox: "0 0 24 24" }), { w: 24, h: 24 });
assert.deepEqual(svgNaturalSize({ viewBox: "0,0,100,50" }), { w: 100, h: 50 }, "comma separated");
assert.deepEqual(
  svgNaturalSize({ width: "200", viewBox: "0 0 100 50" }),
  { w: 200, h: 100 },
  "width + viewBox",
);
assert.deepEqual(
  svgNaturalSize({ height: "50", viewBox: "0 0 100 50" }),
  { w: 100, h: 50 },
  "height + viewBox",
);
assert.deepEqual(
  svgNaturalSize({ width: "100%", height: "100%", viewBox: "0 0 48 48" }),
  { w: 48, h: 48 },
  "percent falls back to viewBox",
);
assert.deepEqual(svgNaturalSize({ width: "40" }), { w: 40, h: 40 }, "single side, no viewBox");
assert.equal(svgNaturalSize({}), null);
assert.equal(svgNaturalSize({ viewBox: "0 0 0 10" }), null, "degenerate viewBox");
assert.equal(svgNaturalSize({ width: "100%", height: "100%" }), null);

// ---- fitting: long side becomes exactly maxSide (up or down), aspect kept
assert.deepEqual(fitSvgSize(24, 24, 512), { w: 512, h: 512 });
assert.deepEqual(fitSvgSize(1024, 512, 512), { w: 512, h: 256 });
assert.deepEqual(fitSvgSize(100, 400, 512), { w: 128, h: 512 });
assert.deepEqual(fitSvgSize(1, 10000, 512), { w: 1, h: 512 }, "never collapses to zero");

// ---- SVG detection
const svg = (s: string) => new TextEncoder().encode(s);
const yes = [
  "<svg xmlns='http://www.w3.org/2000/svg'/>",
  "<svg/>",
  '<?xml version="1.0" encoding="UTF-8"?>\n<svg viewBox="0 0 1 1"></svg>',
  '﻿<?xml version="1.0"?><!-- made with Inkscape --><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg></svg>',
  "  \n<SVG></SVG>",
];
const no = [
  "<html><svg></svg></html>",
  "<svgx/>",
  "hello <svg>",
  "",
  "GIF89a",
  "<?xml version='1.0'?><note/>",
  '{"svg":1}',
];
for (const s of yes) assert.ok(looksLikeSvg(svg(s)), s.slice(0, 40));
for (const s of no) assert.ok(!looksLikeSvg(svg(s)), s.slice(0, 40));
assert.ok(!looksLikeSvg(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0])), "binary");
console.log("svg helper tests passed");
