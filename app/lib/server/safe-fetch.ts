// SSRF-guarded fetch for URLs we did not choose (a Mastodon server, a PDS
// endpoint named by a DID document, a did:web host). Every hop must be https
// on port 443 and resolve only to public addresses; redirects are followed
// manually and re-validated; bodies are size-capped while they stream.
//
// The up-front check alone leaves a DNS-rebinding window (the name is resolved
// once to check it and again to connect). So by default requests go through an
// undici dispatcher whose connect-time lookup applies the same public-address
// rule to the very addresses it connects to.
import dns from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

export class SafeFetchError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
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

type LookupCallback = (err: Error | null, address?: unknown, family?: number) => void;

/**
 * A `net.connect` lookup that refuses non-public addresses. Whatever it
 * returns is what the socket connects to, so there is no gap between checking
 * a name and using it. Handles both the single-address and `all: true` forms.
 */
export function guardedConnectLookup(inner: typeof dns.lookup = dns.lookup) {
  return (hostname: string, options: dns.LookupOptions, callback: LookupCallback) => {
    inner(hostname, { ...options, all: true }, (err, addrs) => {
      if (err) return callback(err);
      const list = addrs as unknown as dns.LookupAddress[];
      if (!list.length || list.some((a) => isPrivateAddress(a.address))) {
        return callback(new SafeFetchError("Address not allowed"));
      }
      if (options.all) return callback(null, list);
      callback(null, list[0].address, list[0].family);
    });
  };
}

let pinned: typeof globalThis.fetch | undefined;
let override: typeof globalThis.fetch | undefined;

/** fetch() that connects only to public addresses, checked at connect time. */
export function pinnedFetch(): typeof globalThis.fetch {
  if (override) return override;
  if (!pinned) {
    const agent = new Agent({ connect: { lookup: guardedConnectLookup() as never } });
    pinned = ((input: unknown, init?: RequestInit) =>
      undiciFetch(input as never, { ...init, dispatcher: agent } as never)) as never;
  }
  return pinned!;
}

/** Test seam: replace the fetch used when a caller doesn't inject one. */
export function setGuardedFetchForTests(fn: typeof globalThis.fetch | undefined) {
  override = fn;
}

export type Lookup = (host: string) => Promise<{ address: string }[]>;

export interface SafeFetchOptions {
  /** Cap on the response body, enforced while reading (not just via content-length). */
  maxBytes: number;
  timeoutMs?: number;
  maxRedirects?: number;
  /**
   * Defaults to a fetch pinned to public addresses at connect time (or the
   * plain global fetch with `allowLocal`). Injecting one skips the pinning.
   */
  fetch?: typeof globalThis.fetch;
  /** Defaults to the system resolver; injectable for tests. */
  lookup?: Lookup;
  /**
   * Skip the https/port/public-address checks. For talking to a local dev PDS
   * only — never set this from production code paths.
   */
  allowLocal?: boolean;
}

const defaultLookup: Lookup = (host) => dnsLookup(host, { all: true });

export async function assertPublicUrl(
  url: URL,
  lookup: Lookup = defaultLookup,
  allowLocal = false,
): Promise<void> {
  if (allowLocal) return;
  if (url.protocol !== "https:") throw new SafeFetchError("Only https URLs are allowed");
  if (url.username || url.password) throw new SafeFetchError("Invalid URL");
  if (url.port && url.port !== "443") throw new SafeFetchError("Unsupported port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new SafeFetchError("Address not allowed");
    return;
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host);
  } catch {
    throw new SafeFetchError("Could not resolve host", 502);
  }
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
    throw new SafeFetchError("Address not allowed");
  }
}

async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > max) throw new SafeFetchError("Response too large", 413);
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
      throw new SafeFetchError("Response too large", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** fetch() with SSRF validation on every hop, a timeout, and a body cap. */
export async function safeFetch(
  input: string,
  init: RequestInit,
  opts: SafeFetchOptions,
): Promise<{ res: Response; body: Uint8Array }> {
  const doFetch = opts.fetch ?? (opts.allowLocal ? globalThis.fetch : pinnedFetch());
  const maxRedirects = opts.maxRedirects ?? 3;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new SafeFetchError("Invalid URL");
  }
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(url, opts.lookup, opts.allowLocal);
    let res: Response;
    try {
      res = await doFetch(url, {
        ...init,
        redirect: "manual",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
      });
    } catch {
      throw new SafeFetchError("Could not reach the server", 502);
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      // Never replay a POST body or credentials across a redirect
      if (init.method && init.method !== "GET") {
        throw new SafeFetchError("Unexpected redirect from the server", 502);
      }
      init = { ...init, headers: undefined };
      continue;
    }
    return { res, body: await readCapped(res, opts.maxBytes) };
  }
  throw new SafeFetchError("Too many redirects", 502);
}
