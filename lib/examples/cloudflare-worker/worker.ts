// A Bluemoji image proxy on Cloudflare Workers: serves /img/{did}/{cid} from
// your own domain so your clients never depend on moji.blue for pixels.
//
// Deploy: `npx wrangler deploy`. Configuration is in wrangler.toml.
import { checkBlobAuthorizer, createBlobProxy } from "@aendra/bluemoji/img-proxy";

interface Env {
  /**
   * An AppView that answers blue.moji.collection.checkBlob, e.g. https://moji.blue
   * or your own. Without it the Worker serves ANY blob from ANY repo, which makes
   * it a free image CDN for the whole network. Set it.
   */
  APPVIEW_URL?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const proxy = createBlobProxy({
      authorize: env.APPVIEW_URL ? checkBlobAuthorizer(env.APPVIEW_URL) : undefined,
    });

    // Only successful, public, immutable responses go in the edge cache. The
    // authorize hook runs on a miss; a hit is served until it expires, so keep
    // Cache-Control's max-age in mind if you need takedowns to bite sooner.
    const cache = (caches as unknown as { default: Cache }).default;
    const cacheable = request.method === "GET";
    if (cacheable) {
      const hit = await cache.match(request);
      if (hit) return hit;
    }
    const res = await proxy.fetch(request);
    if (cacheable && res.status === 200 && /public/.test(res.headers.get("cache-control") ?? "")) {
      ctx.waitUntil(cache.put(request, res.clone()));
    }
    return res;
  },
};
