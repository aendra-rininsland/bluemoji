import { bestImgUrl, imgUrl } from "$lib/pds";
import type { PageServerLoad } from "./$types";

interface ItemView {
  uri: string;
  did: string;
  name: string;
  alt?: string;
  adultOnly?: boolean;
  formats?: Record<string, unknown>;
  stickerFormats?: Record<string, unknown>;
}

interface PackView {
  uri: string;
  name: string;
  description?: string;
  avatar?: string;
  itemCount?: number;
}

export const load: PageServerLoad = async ({ fetch }) => {
  const empty = { emoji: [], stickers: [], packs: [], featuredUris: [], viewerIsAdmin: false };
  const res = await fetch("/xrpc/blue.moji.featured.getFeatured");
  if (!res.ok) return empty;

  const feat = (await res.json()) as {
    emoji: ItemView[];
    stickers: ItemView[];
    packs: PackView[];
    featuredUris?: string[];
    viewerIsAdmin: boolean;
  };

  return {
    emoji: feat.emoji.map((i) => ({ ...i, imageUrl: bestImgUrl(i.did, i.formats) })),
    stickers: feat.stickers.map((i) => ({
      ...i,
      imageUrl:
        imgUrl(i.did, i.stickerFormats?.webp_512) ??
        imgUrl(i.did, i.stickerFormats?.apng_512) ??
        imgUrl(i.did, i.stickerFormats?.png_512) ??
        bestImgUrl(i.did, i.formats),
    })),
    packs: feat.packs,
    featuredUris: feat.featuredUris ?? [],
    viewerIsAdmin: feat.viewerIsAdmin,
  };
};
