import assert from "node:assert/strict";
import { classifyUpload, rawAnimationSlot } from "./upload-kind.ts";

// Tiny 8x8 files written by Pillow
const B64 = {
  gif1: "R0lGODlhCAAIAIEAAAAA/wAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAACAAIAAAIDwABCBxIsKDBgwgTKkwYEAA7",
  gif2: "R0lGODlhCAAIAIEAAAAA/wAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAACAAIAAAIDwABCBxIsKDBgwgTKkwYEAAh+QQBCgABACwAAAAACAAIAIH/AAAAAAAAAAAAAAAIDwABCBxIsKDBgwgTKkwYEAA7",
  png1: "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGNkYPj/nwEPYMInOXwUAAAQXQIOZWZ6QQAAAABJRU5ErkJggg==",
  apng2:
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAACGFjVEwAAAACAAAAAPONk3AAAAAaZmNUTAAAAAAAAAAIAAAACAAAAAAAAAAAAAEACgAA8k66YgAAABZJREFUeJxjZGD4/58BD2DCJzl8FAAAEF0CDmVmekEAAAAaZmNUTAAAAAEAAAAIAAAACAAAAAAAAAAAAAEACgAAaT1QtgAAABpmZEFUAAAAAnicY/zPwPCfAQ9gwic5fBQAABJbAg6+b9MsAAAAAElFTkSuQmCC",
  webp1: "UklGRhwAAABXRUJQVlA4TA8AAAAvB8ABAAcQ0f/+ByKi/wEA",
  webp2:
    "UklGRoQAAABXRUJQVlA4WAoAAAACAAAABwAABwAAQU5JTQYAAAAAAAAAAABBTk1GKAAAAAAAAAAAAAcAAAcAAGQAAAJWUDhMDwAAAC8HwAEABxDR//4HIqL/AQBBTk1GKAAAAAAAAAAAAAcAAAcAAGQAAABWUDhMDwAAAC8HwAEABxD9j/4HIqL/AQA=",
  jpeg1:
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDwGiiimI//2Q==",
};
const f = (k: keyof typeof B64) => new Uint8Array(Buffer.from(B64[k], "base64"));

// The bug this guards: animated files were treated as stills because the
// browser's MIME type and the extension were trusted instead of the bytes.
const apng = classifyUpload(f("apng2"), "blob.png", "image/png");
assert.deepEqual(apng, { kind: "animated", type: "image/png" }, "an APNG saved as .png");
assert.equal(classifyUpload(f("apng2"), "blob.apng", "image/apng").kind, "animated");
assert.equal(classifyUpload(f("gif2"), "party.gif", "image/gif").kind, "animated", "animated GIF");
assert.equal(
  classifyUpload(f("gif2"), "party.png", "image/png").kind,
  "animated",
  "GIF misnamed .png",
);
assert.equal(
  classifyUpload(f("webp2"), "wink.webp", "image/webp").kind,
  "animated",
  "animated WebP",
);
assert.equal(classifyUpload(f("webp2"), "wink", "").kind, "animated", "no name or type at all");

// Stills stay stills, whatever they claim to be
assert.deepEqual(classifyUpload(f("png1"), "a.png", "image/png"), {
  kind: "static",
  type: "image/png",
});
assert.equal(classifyUpload(f("gif1"), "a.gif", "image/gif").kind, "static", "single-frame GIF");
assert.equal(classifyUpload(f("webp1"), "a.webp", "image/webp").kind, "static", "static WebP");
assert.equal(classifyUpload(f("jpeg1"), "a.jpg", "image/jpeg").kind, "static");
assert.equal(
  classifyUpload(f("png1"), "a.apng", "image/apng").kind,
  "static",
  "a still named .apng",
);

// Lottie is only chosen when the bytes aren't a raster image
const zip = new Uint8Array([0x50, 0x4b, 3, 4]);
assert.deepEqual(classifyUpload(zip, "x.lottie", ""), { kind: "lottie", type: null });
assert.deepEqual(classifyUpload(Buffer.from("{}"), "x.json", "application/json"), {
  kind: "lottie",
  type: null,
});
assert.equal(
  classifyUpload(f("gif2"), "x.json", "application/json").kind,
  "animated",
  "a GIF named .json",
);
assert.deepEqual(classifyUpload(Buffer.from("junk"), "x.png", "image/png"), {
  kind: "static",
  type: null,
});

assert.equal(rawAnimationSlot("image/gif"), "gif_128");
assert.equal(rawAnimationSlot("image/webp"), "webp_128");
assert.equal(rawAnimationSlot("image/png"), "apng_128");
assert.equal(rawAnimationSlot(null), "apng_128");

console.log("upload kind tests passed");
