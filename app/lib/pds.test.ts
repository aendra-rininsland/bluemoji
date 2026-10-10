import assert from "node:assert/strict";
import { animatedImgUrl, bestImgUrl } from "./pds.ts";

const ref = (cid: string) => ({ ref: { $link: cid } });
const did = "did:plc:abc";
const enc = encodeURIComponent(did);

assert.equal(animatedImgUrl(did, { png_128: ref("png") }), null, "static-only has no animation");
assert.equal(
  animatedImgUrl(did, { png_128: ref("png"), webp_128: ref("webp") }),
  `/img/${enc}/webp`,
);
assert.equal(
  animatedImgUrl(did, { apng_128: ref("apng"), gif_128: ref("gif"), webp_128: ref("webp") }),
  `/img/${enc}/apng`,
  "apng wins, matching lib/src/render",
);
assert.equal(bestImgUrl(did, { png_128: ref("png"), webp_128: "webpcid" }), `/img/${enc}/webpcid`);
assert.equal(bestImgUrl(did, { png_128: ref("png") }), `/img/${enc}/png`);
assert.equal(bestImgUrl(did, { gif_128: true }), null, "boolean facet claims never make a URL");
assert.equal(bestImgUrl(did, undefined), null);
console.log("pds helper tests passed");
