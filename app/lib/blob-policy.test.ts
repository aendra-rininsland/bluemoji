import assert from "node:assert/strict";
import { BLOB_SECURITY_HEADERS, blobMime, isServableBlobType } from "./blob-policy.ts";

for (const ok of [
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpeg",
  "IMAGE/PNG",
  "image/png; charset=binary",
  "application/octet-stream",
  "application/json",
  "application/zip",
  "application/lottie+zip",
  null,
  undefined,
]) {
  assert.ok(isServableBlobType(ok), String(ok));
}
for (const bad of [
  "image/svg+xml",
  "image/svg+xml; charset=utf-8",
  "IMAGE/SVG+XML",
  "image/svg",
  "image/svg+xml-compressed",
  "text/html",
  "text/xml",
  "application/xml",
  "application/xhtml+xml",
  "image/x-xhtml+xml",
  "application/javascript",
  "video/mp4",
  "",
]) {
  assert.ok(!isServableBlobType(bad), String(bad));
}
assert.equal(blobMime("Image/PNG ; x=y"), "image/png");
assert.equal(BLOB_SECURITY_HEADERS["content-security-policy"], "default-src 'none'; sandbox");
assert.equal(BLOB_SECURITY_HEADERS["x-content-type-options"], "nosniff");
console.log("blob policy tests passed");
