import { parseViewer } from "$hatk/client";
import { imgAuthorizeEnabled, makeAuthorizer } from "$lib/server/blob-access";
import { proxyBlob } from "$lib/server/blob-proxy";
import type { RequestHandler } from "./$types";

// Logic lives in $lib/server/blob-proxy.ts so it can be unit-tested. Only blobs
// the AppView indexes as Bluemoji assets are served (plus the viewer's own, to
// the viewer alone); see $lib/server/blob-access.ts.
export const GET: RequestHandler = ({ params, fetch, request, cookies }) =>
  proxyBlob(params.did, params.cid, fetch, request, {
    authorize: imgAuthorizeEnabled()
      ? makeAuthorizer({ fetch, viewerDid: async () => (await parseViewer(cookies))?.did })
      : undefined,
  });
