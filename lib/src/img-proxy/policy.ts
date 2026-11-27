// What the blob proxy is willing to re-serve from its own origin.
//
// Blobs are attacker-controlled bytes in someone else's PDS. The PDS serves
// them with a sandboxing CSP; since the proxy re-serves them from its own
// origin, it has to enforce that policy too: an SVG (or anything a browser
// would render as a document) opened directly at /img/... would otherwise run
// its scripts with the proxy origin's privileges.

const ALLOWED = /^(image\/|application\/(json|zip|lottie\+zip|octet-stream))/;
// Image types that browsers render as active documents rather than pixels
const ACTIVE = /svg|xml|html/;

/** The MIME type without parameters, lower-cased (`image/SVG+xml; charset=utf-8` becomes `image/svg+xml`). */
export function blobMime(contentType: string | null | undefined): string {
  return (contentType ?? "application/octet-stream").split(";")[0].trim().toLowerCase();
}

export function isServableBlobType(contentType: string | null | undefined): boolean {
  const mime = blobMime(contentType);
  return ALLOWED.test(mime) && !ACTIVE.test(mime);
}

/** Headers every proxied blob response must carry. */
export const BLOB_SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  // Applies when the blob is opened as a document; has no effect on <img> use
  "content-security-policy": "default-src 'none'; sandbox",
} as const;
