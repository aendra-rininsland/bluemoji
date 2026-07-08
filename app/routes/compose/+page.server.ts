import { redirect } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { imgUrl } from "$lib/pds";
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

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const viewer = await parseViewer(cookies);
  if (!viewer) redirect(302, "/");

  const res = await fetch(
    `/xrpc/blue.moji.collection.listCollection?repo=${encodeURIComponent(viewer.did)}&limit=100`,
  );
  if (!res.ok) return { viewer, stickers: [] };

  const { items } = (await res.json()) as { items: ItemView[] };

  // Only stickerFormats-capable items can be attached as a full-size post
  // embed — items with just 128px inline formats aren't sticker-capable.
  const stickers = items
    .filter((item) => item.stickerFormats && Object.keys(item.stickerFormats).length > 0)
    .map((item) => {
      const sf = item.stickerFormats!;
      const thumbUrl = item.formats
        ? (imgUrl(item.did, item.formats.png_128) ?? imgUrl(item.did, item.formats.webp_128))
        : null;
      const fullsizeUrl =
        imgUrl(item.did, sf.png_512) ??
        imgUrl(item.did, sf.webp_512) ??
        imgUrl(item.did, sf.gif_512);
      return { ...item, thumbUrl, fullsizeUrl };
    });

  return { viewer, stickers };
};
