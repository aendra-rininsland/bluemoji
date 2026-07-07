import { error } from "@sveltejs/kit";
import { resolvePds } from "$lib/pds";
import type { RequestHandler } from "./$types";

// Same-origin blob proxy so emoji/sticker assets can be edge-cached by the
// CDN in front of moji.blue. Blobs are CID-addressed, hence immutable.

const DID_RE = /^did:(plc:[a-z2-7]{24}|web:[a-z0-9.-]+)$/i;
const CID_RE = /^[a-z2-7]{10,120}$/i;
const MAX_BYTES = 1_500_000;

const ALLOWED_TYPES = /^(image\/|application\/(json|zip|lottie\+zip|octet-stream))/;

export const GET: RequestHandler = async ({ params, fetch, request }) => {
  const { did, cid } = params;
  if (!DID_RE.test(did) || !CID_RE.test(cid)) error(400, "Invalid did or cid");

  // CID-addressed content never changes: any revalidation is a 304.
  if (request.headers.get("if-none-match")?.includes(cid)) {
    return new Response(null, { status: 304 });
  }

  const pds = await resolvePds(did, fetch).catch(() => null);
  if (!pds) error(404, "Could not resolve PDS");

  const upstream = await fetch(
    `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`,
  ).catch(() => null);
  if (!upstream || !upstream.ok) {
    error(upstream?.status === 404 ? 404 : 502, "Blob unavailable");
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  if (!ALLOWED_TYPES.test(contentType)) error(415, "Unsupported blob type");

  const declaredLength = Number(upstream.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BYTES) error(413, "Blob too large");

  return new Response(upstream.body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
      etag: `"${cid}"`,
      "x-content-type-options": "nosniff",
      "content-disposition": "inline",
      "access-control-allow-origin": "*",
      ...(declaredLength ? { "content-length": String(declaredLength) } : {}),
    },
  });
};
