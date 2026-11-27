// GET a document from a PDS. The PDS is named by a DID document, which anyone
// who owns the DID can write, so the host is attacker-chosen even when the DID
// is the signed-in viewer's own: fetch through the SSRF guard (public https
// hosts only, checked again at connect time, size-capped) rather than a plain
// fetch. See safe-fetch.ts.
import { safeFetch, type SafeFetchOptions } from "./safe-fetch";

const PDS_JSON_MAX_BYTES = 2_000_000;

export interface PdsResponse {
  ok: boolean;
  status: number;
  json<T = unknown>(): Promise<T>;
}

/** A PDS response, or null if it couldn't be reached or the host isn't allowed. */
export async function pdsGet(
  url: string | URL,
  opts: Partial<SafeFetchOptions> = {},
): Promise<PdsResponse | null> {
  try {
    const { res, body } = await safeFetch(
      String(url),
      {},
      {
        maxBytes: PDS_JSON_MAX_BYTES,
        allowLocal: process.env.NODE_ENV !== "production",
        ...opts,
      },
    );
    return {
      ok: res.ok,
      status: res.status,
      json: async <T>() => JSON.parse(new TextDecoder().decode(body)) as T,
    };
  } catch {
    return null;
  }
}
