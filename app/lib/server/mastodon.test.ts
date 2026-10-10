import assert from "node:assert/strict";
import {
  beginAuth,
  canImportEmoji,
  completeAuth,
  fetchEmojiImage,
  listEmojis,
  MastodonError,
  isPrivateAddress,
  parseInstanceDomain,
  sniffImage,
} from "./mastodon.ts";

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`ok - ${name}`);
};

t("parseInstanceDomain accepts domains, urls and handles", () => {
  assert.equal(parseInstanceDomain("mastodon.social"), "mastodon.social");
  assert.equal(parseInstanceDomain(" https://Mastodon.Social/@me "), "mastodon.social");
  assert.equal(parseInstanceDomain("@me@Fosstodon.org"), "fosstodon.org");
  assert.equal(parseInstanceDomain("bücher.example"), "xn--bcher-kva.example");
});

t("parseInstanceDomain rejects non-public hosts", () => {
  for (const bad of [
    "",
    "localhost",
    "127.0.0.1",
    "[::1]",
    "10.0.0.1",
    "foo.localhost",
    "printer.local",
    "https://user:pw@example.com",
    "nodot",
    "a b.com",
  ]) {
    assert.throws(() => parseInstanceDomain(bad), MastodonError, bad);
  }
});

t("isPrivateAddress", () => {
  for (const a of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fe80::1",
    "fd00::1",
    "::ffff:10.0.0.1",
    "224.0.0.1",
  ]) {
    assert.ok(isPrivateAddress(a), a);
  }
  for (const a of ["8.8.8.8", "172.32.0.1", "1.1.1.1", "2606:4700:4700::1111"]) {
    assert.ok(!isPrivateAddress(a), a);
  }
});

t("sniffImage", () => {
  assert.equal(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0])), "image/png");
  assert.equal(sniffImage(Buffer.from("GIF89a")), "image/gif");
  assert.equal(sniffImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 ")), "image/webp");
  assert.equal(sniffImage(Buffer.from("<svg xmlns=")), null);
  assert.equal(sniffImage(Buffer.from("<html>")), null);
});

t("canImportEmoji allows administrators and emoji managers only", () => {
  assert.ok(canImportEmoji({ permissions: "1" }), "administrator");
  assert.ok(canImportEmoji({ permissions: String(1 << 14) }), "manage custom emojis");
  assert.ok(canImportEmoji({ permissions: String((1 << 14) | (1 << 3)) }), "emojis + dashboard");
  assert.ok(canImportEmoji({ permissions: 1 }), "numeric permissions");
  assert.ok(!canImportEmoji({ permissions: "0" }), "plain user");
  assert.ok(!canImportEmoji({ permissions: String(1 << 16) }), "invite_users only");
  assert.ok(!canImportEmoji({ permissions: "garbage" }), "malformed");
  assert.ok(!canImportEmoji({}), "no permissions");
  assert.ok(!canImportEmoji(null), "no role (Mastodon < 4.0)");
});

// --- OAuth + emoji flow against a faked Mastodon (public IP literal, so no DNS) ---
const HOST = "93.184.216.34";
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
const calls: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: RequestInit) => {
  const u = new URL(String(input));
  calls.push(`${init?.method ?? "GET"} ${u.pathname}`);
  const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
  if (u.pathname === "/api/v1/apps") return json({ client_id: "cid", client_secret: "sec" });
  if (u.pathname === "/oauth/token") {
    const body = new URLSearchParams(String(init!.body));
    assert.equal(body.get("code"), "the-code");
    assert.ok(body.get("code_verifier"));
    return json({ access_token: "tok" });
  }
  if (u.pathname === "/api/v1/accounts/verify_credentials") {
    assert.equal((init!.headers as any).authorization, "Bearer tok");
    return json({
      username: "me",
      acct: "me",
      display_name: "Me",
      role: { name: "Admin", permissions: "1" },
    });
  }
  if (u.pathname === "/api/v1/custom_emojis") {
    return json([
      {
        shortcode: "blob",
        url: `https://${HOST}/e/blob.png`,
        static_url: `https://${HOST}/e/blob.png`,
        visible_in_picker: true,
        category: "Blobs",
      },
      { shortcode: "bad", url: "http://insecure/x.png", static_url: "http://insecure/x.png" },
    ]);
  }
  if (u.pathname === "/e/blob.png") return new Response(png, { status: 200 });
  if (u.pathname === "/e/redirect.png")
    return new Response(null, { status: 302, headers: { location: "https://10.0.0.1/x" } });
  return new Response("nope", { status: 404 });
}) as typeof fetch;

const { pending, authorizeUrl } = await beginAuth(
  HOST,
  "https://moji.blue/import/mastodon/callback",
  "https://moji.blue",
);
const au = new URL(authorizeUrl);
assert.equal(au.host, HOST);
assert.equal(au.searchParams.get("state"), pending.state);
assert.equal(au.searchParams.get("code_challenge_method"), "S256");
n++;
console.log("ok - beginAuth registers an app and builds the authorize URL");

const session = await completeAuth(pending, "the-code");
assert.equal(session.acct, `me@${HOST}`);
n++;
console.log("ok - completeAuth exchanges the code and verifies credentials");

// A plain member is rejected and their token revoked
const realFetch2 = globalThis.fetch;
let revoked = false;
globalThis.fetch = (async (input: any, init?: RequestInit) => {
  const u = new URL(String(input));
  if (u.pathname === "/oauth/revoke") {
    revoked = true;
    return new Response("{}");
  }
  if (u.pathname === "/api/v1/accounts/verify_credentials") {
    return new Response(JSON.stringify({ username: "joe", role: { permissions: "0" } }));
  }
  return realFetch2(input, init);
}) as typeof fetch;
await assert.rejects(completeAuth(pending, "the-code"), /Manage Custom Emojis/);
assert.ok(revoked, "token revoked on rejection");
globalThis.fetch = realFetch2;
n++;
console.log("ok - completeAuth rejects non-admins and revokes their token");

const emojis = await listEmojis(session);
assert.deepEqual(
  emojis.map((e) => e.shortcode),
  ["blob"],
  "non-https emoji are dropped",
);
n++;
console.log("ok - listEmojis filters and normalises");

const img = await fetchEmojiImage(emojis[0].url);
assert.equal(img.type, "image/png");
n++;
console.log("ok - fetchEmojiImage sniffs type");

await assert.rejects(fetchEmojiImage(`https://${HOST}/e/redirect.png`), /not allowed/);
await assert.rejects(fetchEmojiImage("https://127.0.0.1/x.png"), /not allowed/);
await assert.rejects(fetchEmojiImage("http://93.184.216.34/x.png"), /https/);
n++;
console.log("ok - fetches refuse private addresses, http, and redirects into private space");
globalThis.fetch = realFetch;

console.log(`${n} tests passed`);
