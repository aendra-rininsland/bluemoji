import assert from "node:assert/strict";
import { isAnimated, sniffImage } from "./image.ts";

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

assert.equal(sniffImage(f("png1")), "image/png");
assert.equal(sniffImage(f("apng2")), "image/png");
assert.equal(sniffImage(f("gif1")), "image/gif");
assert.equal(sniffImage(f("webp1")), "image/webp");
assert.equal(sniffImage(f("jpeg1")), "image/jpeg");
assert.equal(sniffImage(Buffer.from("<svg xmlns=")), null);
assert.equal(sniffImage(Buffer.from("PK")), null);
assert.equal(sniffImage(new Uint8Array()), null);

assert.equal(isAnimated(f("gif1")), false, "1-frame gif");
assert.equal(isAnimated(f("gif2")), true, "2-frame gif");
assert.equal(isAnimated(f("png1")), false, "plain png");
assert.equal(isAnimated(f("apng2")), true, "apng");
assert.equal(isAnimated(f("webp1")), false, "static webp");
assert.equal(isAnimated(f("webp2")), true, "animated webp");
assert.equal(isAnimated(f("jpeg1")), false, "jpeg");

// Truncated / malformed input must not throw or loop
for (const k of Object.keys(B64) as (keyof typeof B64)[]) {
  const full = f(k);
  for (let n = 0; n < full.length; n += 3) isAnimated(full.slice(0, n));
}
isAnimated(Buffer.from("GIF89a"), "image/gif");
isAnimated(new Uint8Array(40).fill(0xff), "image/png");
console.log("image helper tests passed");
