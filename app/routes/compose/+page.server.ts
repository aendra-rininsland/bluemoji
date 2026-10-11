import { redirect } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { imgUrl, animatedImgUrl } from "$lib/pds";
import { INLINE_FORMAT_KEYS, type ComposeEmoji } from "$lib/compose";
import type { PageServerLoad } from "./$types";

interface ItemView {
  uri: string;
  cid: string;
  did: string;
  name: string;
  alt?: string;
  formats?: Record<string, unknown>;
  stickerFormats?: Record<string, unknown>;
  adultOnly?: boolean;
}

const MAX_PAGES = 10; // 1,000 emoji is plenty for a composer; stop runaway paging

function blobCid(ref: unknown): string | undefined {
  return (ref as { ref?: { $link?: string } } | undefined)?.ref?.$link;
}

async function listAll(did: string, fetch: typeof globalThis.fetch): Promise<ItemView[] | null> {
  const items: ItemView[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({ repo: did, limit: "100", ...(cursor ? { cursor } : {}) });
    const res = await fetch(`/xrpc/blue.moji.collection.listCollection?${qs}`);
    if (!res.ok) return page === 0 ? null : items;
    const body = (await res.json()) as { items: ItemView[]; cursor?: string };
    items.push(...body.items);
    if (!body.cursor) break;
    cursor = body.cursor;
  }
  return items;
}

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const viewer = await parseViewer(cookies);
  if (!viewer) redirect(302, "/");

  const items = await listAll(viewer.did, fetch);
  if (!items) return { viewer, emoji: [] };

  // Every item can go inline in post text; only items with stickerFormats
  // can also be attached as a full-size sticker embed.
  const emoji = items.map((item) => {
    const formatCids: ComposeEmoji["formatCids"] = {};
    for (const key of INLINE_FORMAT_KEYS) {
      const cid = blobCid(item.formats?.[key]);
      if (cid) formatCids[key] = cid;
    }

    const sf = item.stickerFormats;
    const hasSticker = !!sf && Object.keys(sf).length > 0;

    return {
      uri: item.uri,
      cid: item.cid,
      did: item.did,
      name: item.name,
      alt: item.alt,
      adultOnly: item.adultOnly,
      formatCids,
      // Static thumbnail for the picker grid; animated rendition for the
      // composer preview so it matches how the post will render.
      thumbUrl: item.formats
        ? (imgUrl(item.did, item.formats.png_128) ?? imgUrl(item.did, item.formats.webp_128))
        : null,
      inlineUrl: item.formats
        ? (animatedImgUrl(item.did, item.formats) ?? imgUrl(item.did, item.formats.png_128))
        : null,
      sticker: hasSticker
        ? {
            stickerFormats: sf,
            fullsizeUrl:
              imgUrl(item.did, sf.png_512) ??
              imgUrl(item.did, sf.webp_512) ??
              imgUrl(item.did, sf.gif_512),
          }
        : null,
    };
  });

  return { viewer, emoji };
};
