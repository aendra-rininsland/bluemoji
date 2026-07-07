import { error } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
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

function imgUrl(did: string, cid: string): string {
  return `/img/${encodeURIComponent(did)}/${encodeURIComponent(cid)}`;
}

function buildSegments(text: string, facets: AtFacet[]): Segment[] {
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
    const cid = formats.png_128 ?? formats.webp_128 ?? formats.gif_128;
    const url = typeof cid === "string" ? imgUrl(did, cid) : "";

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

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
  const viewer = await parseViewer(cookies);
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

  const segments = buildSegments(post.text ?? "", facets);

  // Hydrate a blue.moji.embed.sticker attachment, if present.
  let sticker: { url: string; name: string; alt?: string } | null = null;
  const embed = post.embed as
    | {
        $type?: string;
        sticker?: {
          did: string;
          name: string;
          alt?: string;
          formats?: Record<string, string | undefined>;
        };
      }
    | undefined;
  if (embed?.$type === "blue.moji.embed.sticker" && embed.sticker) {
    const s = embed.sticker;
    const cidStr =
      s.formats?.png_512 ?? s.formats?.webp_512 ?? s.formats?.gif_512 ?? s.formats?.apng_512;
    sticker = { url: cidStr ? imgUrl(s.did, cidStr) : "", name: s.name, alt: s.alt };
  }

  // Reactions: aggregated groups from the AppView, with emoji images resolved.
  interface EmojiRef {
    uri: string;
    name: string;
    alt?: string;
    formats?: Record<string, string | boolean | undefined>;
  }
  interface ReactionGroup {
    emoji: EmojiRef;
    count: number;
    viewer?: string;
  }

  let groups: (ReactionGroup & { imageUrl: string | null })[] = [];
  const reactionsRes = await fetch(
    `/xrpc/blue.moji.feed.getReactions?uri=${encodeURIComponent(uri)}`,
  ).catch(() => null);
  if (reactionsRes?.ok) {
    const data = (await reactionsRes.json()) as { groups: ReactionGroup[] };
    groups = (data.groups ?? []).map((group) => {
      const emojiDid = group.emoji.uri.split("/")[2];
      const cidStr =
        group.emoji.formats?.png_128 ??
        group.emoji.formats?.webp_128 ??
        group.emoji.formats?.gif_128;
      const imageUrl = emojiDid && typeof cidStr === "string" ? imgUrl(emojiDid, cidStr) : null;
      return { ...group, imageUrl };
    });
  }

  // The viewer's collection, for the reaction picker.
  let pickerItems: {
    uri: string;
    name: string;
    alt?: string;
    imageUrl: string | null;
    formatCids: Record<string, string>;
  }[] = [];
  if (viewer) {
    const viewerPds = await resolvePds(viewer.did, fetch).catch(() => null);
    if (viewerPds) {
      const listUrl = new URL(`${viewerPds}/xrpc/com.atproto.repo.listRecords`);
      listUrl.searchParams.set("repo", viewer.did);
      listUrl.searchParams.set("collection", "blue.moji.collection.item");
      listUrl.searchParams.set("limit", "100");
      const listRes = await fetch(listUrl).catch(() => null);
      if (listRes?.ok) {
        const { records } = (await listRes.json()) as { records: any[] };
        pickerItems = (records ?? []).map((r) => {
          const formatCids: Record<string, string> = {};
          for (const key of ["png_128", "webp_128", "gif_128", "apng_128", "lottie"]) {
            const link = r.value?.formats?.[key]?.ref?.$link;
            if (link) formatCids[key] = link;
          }
          const pngCid = formatCids.png_128 ?? formatCids.webp_128 ?? formatCids.gif_128;
          return {
            uri: r.uri as string,
            name: (r.value?.name as string) ?? "",
            alt: r.value?.alt as string | undefined,
            imageUrl: pngCid ? imgUrl(viewer.did, pngCid) : null,
            formatCids,
          };
        });
      }
    }
  }

  return { handle, did, rkey, uri, cid, post, segments, sticker, viewer, groups, pickerItems };
};
