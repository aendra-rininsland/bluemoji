// Underscore prefix keeps this module out of the server/ scanner.
import { normalizeAlias } from "../app/lib/alias.ts";

/**
 * Cloudflare cache purging for the AppView's cached XRPC reads.
 *
 * Why this exists: `blue.moji.collection.getItem` is cached at the edge (see
 * ROADMAP Phase 2), so a taken-down or deleted emoji would keep being served
 * until the edge TTL expired. Purging on the events that change what getItem
 * returns closes that gap, and lets the edge TTL stay long.
 *
 * Purge by URL is the only mechanism available below Enterprise (no cache tags
 * or prefixes), and a URL has to match the cached one exactly, query string
 * included. So we enumerate the URL spellings clients actually send. That is
 * best effort: a client that spells a lookup unusually (odd casing, extra
 * parameters) is only covered by the edge TTL, which stays the backstop.
 */

export interface PurgeConfig {
  zoneId: string;
  apiToken: string;
  /** Public origin the cache keys are built from, e.g. https://moji.blue */
  origin: string;
  /** URLs per API call. Cloudflare allows 30 on the free plan. */
  batchSize: number;
  /** Pause between calls, to stay under the purge rate limit. */
  minIntervalMs: number;
}

/** Null (purging disabled) unless a zone, token and public origin are all set. */
export function purgeConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): PurgeConfig | null {
  const zoneId = env.CLOUDFLARE_ZONE_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const domain = env.RAILWAY_PUBLIC_DOMAIN;
  const origin = env.PUBLIC_ORIGIN ?? (domain ? `https://${domain}` : undefined);
  if (!zoneId || !apiToken || !origin) return null;
  return {
    zoneId,
    apiToken,
    origin: origin.replace(/\/$/, ""),
    batchSize: Number(env.CLOUDFLARE_PURGE_BATCH ?? 30),
    minIntervalMs: Number(env.CLOUDFLARE_PURGE_INTERVAL_MS ?? 250),
  };
}

const GET_ITEM = "/xrpc/blue.moji.collection.getItem";

/**
 * Every spelling of a getItem URL that clients are known to send for one emoji.
 * `repos` is the owner's DID and handle (callers pass whichever they know);
 * the alias may be sent colon-wrapped or bare; parameters may be in either
 * order; and a colon may be percent-encoded or raw, depending on the client.
 */
export function getItemUrls(origin: string, repos: string[], name: string): string[] {
  const alias = normalizeAlias(name);
  const names = [`:${alias}:`, alias];
  const encoders = [
    encodeURIComponent,
    (v: string) => new URLSearchParams({ v }).toString().slice(2),
  ];
  const out = new Set<string>();

  for (const repo of repos) {
    for (const n of names) {
      for (const enc of encoders) {
        const pairs: [string, string][] = [
          ["repo", enc(repo)],
          ["name", enc(n)],
        ];
        for (const order of [pairs, [...pairs].reverse()]) {
          const qs = order.map(([k, v]) => `${k}=${v}`).join("&");
          out.add(`${origin}${GET_ITEM}?${qs}`);
          // curl and some clients leave colons raw
          out.add(`${origin}${GET_ITEM}?${qs.replace(/%3A/gi, ":")}`);
        }
      }
    }
  }
  return [...out];
}

/**
 * The cached spellings of an image URL for one blob. A DID has colons, which
 * clients send either percent-encoded (what the app's own `imgUrl` builds) or
 * raw. Image URLs have no query string, so these two are the whole set.
 */
export function imgUrls(origin: string, did: string, cid: string): string[] {
  return [
    `${origin}/img/${encodeURIComponent(did)}/${encodeURIComponent(cid)}`,
    `${origin}/img/${did}/${cid}`,
  ];
}

/** Total URLs held in the queue; beyond this new ones are dropped and logged. */
const MAX_PENDING = 50_000;
const MAX_ATTEMPTS = 3;

type Logger = (msg: string, extra?: Record<string, unknown>) => void;

/**
 * Queues URLs and drains them to Cloudflare one batch at a time. Purging must
 * never get in the way of moderation or indexing, so `enqueue` returns
 * immediately and failures are logged, not thrown.
 */
export class CloudflarePurger {
  private pending = new Set<string>();
  private draining: Promise<void> | null = null;
  purged = 0;
  failed = 0;

  constructor(
    private readonly config: PurgeConfig | null,
    private readonly deps: {
      fetch?: typeof fetch;
      sleep?: (ms: number) => Promise<void>;
      log?: Logger;
    } = {},
  ) {}

  get enabled() {
    return this.config !== null;
  }

  private log(msg: string, extra?: Record<string, unknown>) {
    (this.deps.log ?? ((m, e) => console.log(`[cache-purge] ${m}`, e ?? "")))(msg, extra);
  }

  private sleep(ms: number) {
    return (this.deps.sleep ?? ((n) => new Promise((r) => setTimeout(r, n))))(ms);
  }

  enqueue(urls: Iterable<string>) {
    if (!this.config) return;
    for (const url of urls) {
      if (this.pending.size >= MAX_PENDING) {
        this.log("queue full, dropping URLs", { max: MAX_PENDING });
        break;
      }
      this.pending.add(url);
    }
    if (this.pending.size && !this.draining) {
      this.draining = this.drain().finally(() => {
        this.draining = null;
      });
    }
  }

  /** Resolves when everything queued so far has been attempted. */
  async idle() {
    while (this.draining) await this.draining;
  }

  private async drain() {
    const config = this.config!;
    while (this.pending.size) {
      const batch = [...this.pending].slice(0, config.batchSize);
      for (const url of batch) this.pending.delete(url);
      const ok = await this.send(batch);
      if (ok) this.purged += batch.length;
      else this.failed += batch.length;
      if (this.pending.size) await this.sleep(config.minIntervalMs);
    }
  }

  private async send(files: string[]): Promise<boolean> {
    const config = this.config!;
    const doFetch = this.deps.fetch ?? fetch;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await doFetch(
          `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/purge_cache`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${config.apiToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ files }),
          },
        );
        if (res.ok) return true;
        // Rate limited or a server error: back off and retry. Anything else
        // (bad token, bad zone) will not improve by retrying.
        if (res.status !== 429 && res.status < 500) {
          this.log("purge rejected", { status: res.status });
          return false;
        }
        const retryAfter = Number(res.headers.get("retry-after")) || attempt * 2;
        await this.sleep(retryAfter * 1000);
      } catch (e) {
        this.log("purge request failed", { error: e instanceof Error ? e.message : String(e) });
        await this.sleep(attempt * 1000);
      }
    }
    this.log("purge gave up", { urls: files.length });
    return false;
  }
}
