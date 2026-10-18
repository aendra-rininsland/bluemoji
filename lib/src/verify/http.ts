// Small fetch helpers shared by the verify modules.

export interface HttpOptions {
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  /** Allow http:// URLs (local development only). */
  allowInsecure?: boolean;
}

export function allowedUrl(url: URL, opts: Pick<HttpOptions, "allowInsecure">): boolean {
  if (url.username || url.password) return false;
  return url.protocol === "https:" || (opts.allowInsecure === true && url.protocol === "http:");
}

export async function getJson(url: URL, opts: HttpOptions): Promise<{ status: number; body: any }> {
  const f = opts.fetch ?? globalThis.fetch;
  const res = await f(url, {
    signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    headers: { accept: "application/json" },
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  return { status: res.status, body };
}
