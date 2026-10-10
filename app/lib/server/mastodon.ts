// Server-side helpers for the Mastodon → Bluemoji importer.
//
// Everything here talks to a user-supplied host, so the first concern is
// SSRF: instance domains and emoji URLs are validated as public https hosts
// before any request, redirects are followed manually (re-validated each
// hop), and response bodies are size-capped.
import { createHash, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Cookies } from "@sveltejs/kit";

export const SCOPE = "read:accounts";
export const MAX_IMAGE_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_JSON_BYTES = 8_000_000;

export class MastodonError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------- hosts

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;

/**
 * Normalise what a user typed ("https://Mastodon.Social/", "@me@mastodon.social",
 * "mastodon.social") to a bare lowercase hostname. Throws MastodonError.
 * IDN hosts are converted to their ASCII form by the URL parser.
 */
export function parseInstanceDomain(input: string): string {
  let raw = input.trim();
  if (!raw) throw new MastodonError("Enter your Mastodon server's domain");
  // Accept a full handle (@user@host or user@host)
  const at = raw.lastIndexOf("@");
  if (at !== -1 && !raw.includes("/")) raw = raw.slice(at + 1);
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new MastodonError("That doesn't look like a server domain");
  }
  if (url.username || url.password) throw new MastodonError("Invalid server domain");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (isIP(host) || host.startsWith("[") || !DOMAIN_RE.test(host)) {
    throw new MastodonError("Enter a server domain such as mastodon.social");
  }
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new MastodonError("Enter a public server domain");
  }
  return host;
}

/** True for loopback, private, link-local, CGNAT, multicast and reserved addresses. */
export function isPrivateAddress(addr: string): boolean {
  const v = isIP(addr);
  if (v === 4) {
    const [a, b] = addr.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (v === 6) {
    const a = addr.toLowerCase();
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      a === "::" ||
      a === "::1" ||
      a.startsWith("fe8") ||
      a.startsWith("fe9") ||
      a.startsWith("fea") ||
      a.startsWith("feb") ||
      a.startsWith("fc") ||
      a.startsWith("fd") ||
      a.startsWith("ff") ||
      a.startsWith("::ffff:")
    );
  }
  return true;
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "https:") throw new MastodonError("Only https URLs are allowed");
  if (url.username || url.password) throw new MastodonError("Invalid URL");
  if (url.port && url.port !== "443") throw new MastodonError("Unsupported port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new MastodonError("Address not allowed");
    return;
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new MastodonError("Could not resolve host", 502);
  }
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
    throw new MastodonError("Address not allowed");
  }
}

async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > max) throw new MastodonError("Response too large", 413);
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw new MastodonError("Response too large", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** fetch() with SSRF validation on every hop, a timeout, and a body cap. */
async function safeFetch(
  input: string,
  init: RequestInit,
  maxBytes: number,
): Promise<{ res: Response; body: Uint8Array }> {
  let url = new URL(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      throw new MastodonError("Could not reach the server", 502);
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      // Never replay a POST body or credentials across a redirect
      if (init.method && init.method !== "GET") {
        throw new MastodonError("Unexpected redirect from the server", 502);
      }
      init = { ...init, headers: undefined };
      continue;
    }
    return { res, body: await readCapped(res, maxBytes) };
  }
  throw new MastodonError("Too many redirects", 502);
}

async function apiJson<T>(
  domain: string,
  path: string,
  opts: { token?: string; method?: string; form?: Record<string, string> } = {},
): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let body: string | undefined;
  if (opts.form) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(opts.form).toString();
  }
  const { res, body: bytes } = await safeFetch(
    `https://${domain}${path}`,
    { method: opts.method ?? "GET", headers, body },
    MAX_JSON_BYTES,
  );
  const text = new TextDecoder().decode(bytes);
  if (!res.ok) {
    let msg = `${domain} returned HTTP ${res.status}`;
    try {
      const j = JSON.parse(text);
      if (j.error_description || j.error) msg = String(j.error_description ?? j.error);
    } catch {}
    throw new MastodonError(msg, res.status === 401 || res.status === 403 ? 401 : 502);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new MastodonError(`${domain} didn't return a Mastodon API response`, 502);
  }
}

// ---------------------------------------------------------------- OAuth

export interface PendingAuth {
  domain: string;
  clientId: string;
  clientSecret: string;
  state: string;
  verifier: string;
  redirectUri: string;
}

export interface MastodonSession {
  domain: string;
  token: string;
  clientId: string;
  clientSecret: string;
  acct: string;
  displayName: string;
  avatar?: string;
}

const b64url = (b: Buffer) => b.toString("base64url");

/** Dynamically register an OAuth app on the instance and build the authorize URL. */
export async function beginAuth(
  domain: string,
  redirectUri: string,
  website: string,
): Promise<{ pending: PendingAuth; authorizeUrl: string }> {
  const app = await apiJson<{ client_id?: string; client_secret?: string }>(
    domain,
    "/api/v1/apps",
    {
      method: "POST",
      form: {
        client_name: "moji.blue (Bluemoji importer)",
        redirect_uris: redirectUri,
        scopes: SCOPE,
        website,
      },
    },
  );
  if (!app.client_id || !app.client_secret) {
    throw new MastodonError(`${domain} doesn't appear to be a Mastodon-compatible server`, 502);
  }
  const verifier = b64url(randomBytes(32));
  const pending: PendingAuth = {
    domain,
    clientId: app.client_id,
    clientSecret: app.client_secret,
    state: b64url(randomBytes(16)),
    verifier,
    redirectUri,
  };
  const u = new URL(`https://${domain}/oauth/authorize`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", pending.clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("scope", SCOPE);
  u.searchParams.set("state", pending.state);
  // PKCE (Mastodon ≥ 4.3; older servers ignore the extra parameters)
  u.searchParams.set("code_challenge", b64url(createHash("sha256").update(verifier).digest()));
  u.searchParams.set("code_challenge_method", "S256");
  return { pending, authorizeUrl: u.toString() };
}

interface MastodonAccount {
  acct: string;
  username: string;
  display_name?: string;
  avatar?: string;
  role?: { name?: string; permissions?: string | number } | null;
}

// Mastodon's UserRole::FLAGS (app/models/user_role.rb). Administrator implies
// every permission, but is checked explicitly so we don't depend on the
// server expanding the bitmask for us.
const PERM_ADMINISTRATOR = 1n << 0n;
const PERM_MANAGE_CUSTOM_EMOJIS = 1n << 14n;

/**
 * Whether a verify_credentials `role` may import the server's emoji: the
 * account must be an administrator or hold "Manage Custom Emojis". Fails
 * closed for servers that report no role (Mastodon < 4.0, most non-Mastodon
 * implementations) or a malformed one.
 */
export function canImportEmoji(role: MastodonAccount["role"]): boolean {
  if (!role || (typeof role.permissions !== "string" && typeof role.permissions !== "number")) {
    return false;
  }
  try {
    const perms = BigInt(role.permissions);
    return (perms & (PERM_ADMINISTRATOR | PERM_MANAGE_CUSTOM_EMOJIS)) !== 0n;
  } catch {
    return false;
  }
}

/** Exchange the authorization code and look up who just logged in. */
export async function completeAuth(pending: PendingAuth, code: string): Promise<MastodonSession> {
  const tok = await apiJson<{ access_token?: string }>(pending.domain, "/oauth/token", {
    method: "POST",
    form: {
      grant_type: "authorization_code",
      code,
      client_id: pending.clientId,
      client_secret: pending.clientSecret,
      redirect_uri: pending.redirectUri,
      scope: SCOPE,
      code_verifier: pending.verifier,
    },
  });
  if (!tok.access_token) throw new MastodonError("The server didn't issue an access token", 502);
  const me = await apiJson<MastodonAccount>(pending.domain, "/api/v1/accounts/verify_credentials", {
    token: tok.access_token,
  });
  const session: MastodonSession = {
    domain: pending.domain,
    token: tok.access_token,
    clientId: pending.clientId,
    clientSecret: pending.clientSecret,
    acct: `${me.username ?? me.acct}@${pending.domain}`,
    displayName: me.display_name || me.username || me.acct,
    avatar: me.avatar,
  };
  if (!canImportEmoji(me.role)) {
    await revokeToken(session);
    throw new MastodonError(
      `Only administrators of ${pending.domain}, or accounts with the "Manage Custom Emojis" permission, can import its emoji.`,
      403,
    );
  }
  return session;
}

/** Best-effort token revocation on logout. */
export async function revokeToken(s: MastodonSession): Promise<void> {
  await apiJson(s.domain, "/oauth/revoke", {
    method: "POST",
    form: { client_id: s.clientId, client_secret: s.clientSecret, token: s.token },
  }).catch(() => {});
}

// --------------------------------------------------------------- emoji

export interface MastodonEmoji {
  shortcode: string;
  url: string;
  static_url: string;
  visible_in_picker: boolean;
  category?: string | null;
}

interface CacheEntry {
  at: number;
  emojis: MastodonEmoji[];
}
const emojiCache = new Map<string, CacheEntry>();
const CACHE_MS = 5 * 60_000;

/** The instance's custom emoji (public endpoint; the token is sent for locked-down servers). */
export async function listEmojis(s: Pick<MastodonSession, "domain" | "token">, fresh = false) {
  const hit = emojiCache.get(s.domain);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.emojis;
  const raw = await apiJson<unknown>(s.domain, "/api/v1/custom_emojis", { token: s.token });
  if (!Array.isArray(raw)) throw new MastodonError("Unexpected emoji list from the server", 502);
  const emojis = raw
    .filter(
      (e): e is MastodonEmoji =>
        e &&
        typeof e.shortcode === "string" &&
        typeof e.url === "string" &&
        e.url.startsWith("https://"),
    )
    .map((e) => ({
      shortcode: e.shortcode,
      url: e.url,
      static_url: typeof e.static_url === "string" ? e.static_url : e.url,
      visible_in_picker: e.visible_in_picker !== false,
      category: e.category ?? null,
    }));
  emojiCache.set(s.domain, { at: Date.now(), emojis });
  if (emojiCache.size > 200) emojiCache.delete(emojiCache.keys().next().value!);
  return emojis;
}

export type ImageType = "image/png" | "image/gif" | "image/webp" | "image/jpeg";

/** Identify an image by magic bytes — never trust the upstream Content-Type. */
export function sniffImage(b: Uint8Array): ImageType | null {
  const eq = (off: number, sig: number[]) => sig.every((v, i) => b[off + i] === v);
  if (eq(0, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (eq(0, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  if (eq(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  return null;
}

/**
 * Download one emoji image from a URL taken from the instance's own emoji
 * list (callers must never pass a client-supplied URL).
 */
export async function fetchEmojiImage(url: string) {
  const { res, body } = await safeFetch(url, { headers: { accept: "image/*" } }, MAX_IMAGE_BYTES);
  if (!res.ok) throw new MastodonError(`Emoji image returned HTTP ${res.status}`, 502);
  const type = sniffImage(body);
  if (!type) throw new MastodonError("Unsupported image type", 415);
  return { body, type };
}

// ------------------------------------------------------------- cookies
//
// The Mastodon login is held in httpOnly cookies scoped to /import, so it
// never touches the AppView database and is gone when the user logs out.
// Contents are re-validated on every read (a user can edit their own cookie).

const SESSION_COOKIE = "mstdn_session";
const PENDING_COOKIE = "mstdn_pending";

function cookieOpts(maxAge: number) {
  return {
    path: "/import",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

function readJson<T>(cookies: Cookies, name: string): T | null {
  const raw = cookies.get(name);
  if (!raw) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof v?.domain !== "string" || parseInstanceDomain(v.domain) !== v.domain) return null;
    return v as T;
  } catch {
    return null;
  }
}

const writeJson = (cookies: Cookies, name: string, v: unknown, maxAge: number) =>
  cookies.set(name, Buffer.from(JSON.stringify(v)).toString("base64url"), cookieOpts(maxAge));

export const getPending = (c: Cookies) => readJson<PendingAuth>(c, PENDING_COOKIE);
export const setPending = (c: Cookies, p: PendingAuth) => writeJson(c, PENDING_COOKIE, p, 600);
export const clearPending = (c: Cookies) => c.delete(PENDING_COOKIE, { path: "/import" });

export function getSession(c: Cookies): MastodonSession | null {
  const s = readJson<MastodonSession>(c, SESSION_COOKIE);
  return s && typeof s.token === "string" ? s : null;
}
export const setSession = (c: Cookies, s: MastodonSession) =>
  writeJson(c, SESSION_COOKIE, s, 60 * 60 * 24);
export const clearSession = (c: Cookies) => c.delete(SESSION_COOKIE, { path: "/import" });

/** Our public origin (Railway's proxy can make url.origin report http). */
export function publicOrigin(requestOrigin: string): string {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  return process.env.NODE_ENV === "production" && domain ? `https://${domain}` : requestOrigin;
}
