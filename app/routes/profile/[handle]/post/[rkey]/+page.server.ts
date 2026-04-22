import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

interface BluemojiFormats {
  $type?: string;
  png_128?: string;
  webp_128?: string;
  gif_128?: string;
  apng_128?: boolean;
  lottie?: boolean;
}

interface BluemojiFacetFeature {
  $type: "blue.moji.richtext.facet";
  did: string;
  name: string;
  alt?: string;
  fallbackText?: string;
  formats: BluemojiFormats;
}

interface AtFacet {
  index: { byteStart: number; byteEnd: number };
  features: unknown[];
}

export type TextSegment = { type: "text"; text: string };
export type EmojiSegment = {
  type: "emoji";
  name: string;
  alt?: string;
  fallbackText?: string;
  url: string;
};
export type Segment = TextSegment | EmojiSegment;

const pdsCache = new Map<string, string>();

async function resolvePds(did: string, fetch: typeof globalThis.fetch): Promise<string> {
  const cached = pdsCache.get(did);
  if (cached) return cached;

  let doc: { service?: { type: string; serviceEndpoint: string }[] };
  if (did.startsWith("did:web:")) {
    const domain = did.slice("did:web:".length);
    const res = await fetch(`https://${domain}/.well-known/did.json`);
    if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
    doc = await res.json();
  } else {
    const res = await fetch(`https://plc.directory/${did}`);
    if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
    doc = await res.json();
  }

  const service = doc.service?.find((s) => s.type === "AtprotoPersonalDataServer");
  if (!service?.serviceEndpoint) throw new Error(`No PDS found for DID: ${did}`);
  pdsCache.set(did, service.serviceEndpoint);
  return service.serviceEndpoint;
}

function blobUrl(pds: string, did: string, cid: string): string {
  return `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

function buildSegments(
  text: string,
  facets: AtFacet[],
  emojiPdsMap: Map<string, string>,
): Segment[] {
  const textBytes = new TextEncoder().encode(text);
  const decoder = new TextDecoder();

  const mojiSlices: {
    byteStart: number;
    byteEnd: number;
    feature: BluemojiFacetFeature;
  }[] = [];

  for (const facet of facets) {
    for (const feature of facet.features) {
      if ((feature as BluemojiFacetFeature).$type === "blue.moji.richtext.facet") {
        mojiSlices.push({
          byteStart: facet.index.byteStart,
          byteEnd: facet.index.byteEnd,
          feature: feature as BluemojiFacetFeature,
        });
      }
    }
  }

  mojiSlices.sort((a, b) => a.byteStart - b.byteStart);

  const segments: Segment[] = [];
  let pos = 0;

  for (const slice of mojiSlices) {
    if (pos < slice.byteStart) {
      segments.push({
        type: "text",
        text: decoder.decode(textBytes.slice(pos, slice.byteStart)),
      });
    }

    const { did, name, alt, fallbackText, formats } = slice.feature;
    const emojiPds = emojiPdsMap.get(did);
    const cid = formats.png_128 ?? formats.webp_128 ?? formats.gif_128;
    const url = emojiPds && cid ? blobUrl(emojiPds, did, cid) : "";

    segments.push({ type: "emoji", name, alt, fallbackText, url });
    pos = slice.byteEnd;
  }

  if (pos < textBytes.length) {
    segments.push({
      type: "text",
      text: decoder.decode(textBytes.slice(pos)),
    });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", text });
  }

  return segments;
}

export const load: PageServerLoad = async ({ params, fetch }) => {
  const { handle, rkey } = params;

  let did: string;
  if (handle.startsWith("did:")) {
    did = handle;
  } else {
    const res = await fetch(
      `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    );
    if (!res.ok) error(404, `Could not resolve handle: ${handle}`);
    const data = await res.json();
    did = data.did;
  }

  const pds = await resolvePds(did, fetch).catch(() => null);
  if (!pds) error(404, `Could not resolve PDS for: ${did}`);

  const recordRes = await fetch(
    `${pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=app.bsky.feed.post&rkey=${encodeURIComponent(rkey)}`,
  );
  if (!recordRes.ok) error(404, "Post not found");

  const { value: post, cid } = await recordRes.json();
  const uri = `at://${did}/app.bsky.feed.post/${rkey}`;

  const facets: AtFacet[] = post.facets ?? [];

  const emojiDids = new Set<string>();
  for (const facet of facets) {
    for (const feature of facet.features) {
      if ((feature as BluemojiFacetFeature).$type === "blue.moji.richtext.facet") {
        emojiDids.add((feature as BluemojiFacetFeature).did);
      }
    }
  }

  const emojiPdsMap = new Map<string, string>();
  await Promise.all(
    [...emojiDids].map(async (emojiDid) => {
      const emojiPds = await resolvePds(emojiDid, fetch).catch(() => null);
      if (emojiPds) emojiPdsMap.set(emojiDid, emojiPds);
    }),
  );

  const segments = buildSegments(post.text ?? "", facets, emojiPdsMap);

  return { handle, did, rkey, uri, cid, post, segments };
};
