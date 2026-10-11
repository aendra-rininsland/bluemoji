import { proxyBlob } from "$lib/server/blob-proxy";
import type { RequestHandler } from "./$types";

// Logic lives in $lib/server/blob-proxy.ts so it can be unit-tested.
export const GET: RequestHandler = ({ params, fetch, request }) =>
  proxyBlob(params.did, params.cid, fetch, request);
