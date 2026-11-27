// What the /img/{did}/{cid} blob proxy is willing to re-serve from our origin.
// The implementation is shared with the portable proxy in
// `@aendra/bluemoji/img-proxy`; see lib/src/img-proxy/policy.ts for why.
export {
  BLOB_SECURITY_HEADERS,
  blobMime,
  isServableBlobType,
} from "../../lib/src/img-proxy/policy.ts";
