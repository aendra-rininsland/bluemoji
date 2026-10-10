import { error } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { MastodonError, fetchEmojiImage, getSession, listEmojis } from "$lib/server/mastodon";
import type { RequestHandler } from "./$types";

// Same-origin proxy for the connected instance's emoji images. It takes a
// *shortcode*, never a URL: the image URL always comes from the instance's
// own emoji list, so this can't be used as an open proxy. The importer's
// browser code also needs same-origin bytes (instance CDNs rarely send CORS
// headers) to resize and upload them.
export const GET: RequestHandler = async ({ url, cookies }) => {
  if (!(await parseViewer(cookies))) error(401, "Authentication required");
  const session = getSession(cookies);
  if (!session) error(401, "Not connected to Mastodon");

  const shortcode = url.searchParams.get("shortcode");
  if (!shortcode) error(400, "shortcode is required");

  try {
    const emoji = (await listEmojis(session)).find((e) => e.shortcode === shortcode);
    if (!emoji) error(404, "No such emoji");
    const src = url.searchParams.get("static") === "1" ? emoji.static_url : emoji.url;
    const { body, type } = await fetchEmojiImage(src);
    return new Response(Buffer.from(body), {
      headers: {
        "content-type": type,
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
      },
    });
  } catch (e) {
    if (e instanceof MastodonError) error(e.status === 401 ? 502 : e.status, e.message);
    throw e;
  }
};
