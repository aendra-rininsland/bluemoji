import test from "node:test";
import assert from "node:assert";

// picker.ts defines a Custom Element class at import time; a bare stub lets the
// pure helper be tested without a DOM (the element itself is checked in a browser).
(globalThis as any).HTMLElement ??= class {};
const { resolveApiBase } = await import("./picker");

test("there is no default AppView", () => {
  assert.equal(resolveApiBase(null), null);
  assert.equal(resolveApiBase(undefined), null);
  assert.equal(resolveApiBase(""), null);
});

test("an https origin is accepted and normalised to its origin", () => {
  assert.equal(resolveApiBase("https://moji.blue"), "https://moji.blue");
  assert.equal(resolveApiBase("https://moji.blue/some/path?x=1"), "https://moji.blue");
  assert.equal(resolveApiBase("https://appview.example:8443/"), "https://appview.example:8443");
});

test("plain http is only allowed for localhost", () => {
  assert.equal(resolveApiBase("http://localhost:3000"), "http://localhost:3000");
  assert.equal(resolveApiBase("http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  assert.equal(resolveApiBase("http://moji.blue"), null);
  assert.equal(resolveApiBase("http://evil.example"), null);
});

test("junk, other schemes and credentials are refused", () => {
  for (const bad of [
    "moji.blue",
    "//moji.blue",
    "javascript:alert(1)",
    "data:text/html,x",
    "ftp://moji.blue",
    "https://u:p@moji.blue",
    "not a url",
  ]) {
    assert.equal(resolveApiBase(bad), null, bad);
  }
});
