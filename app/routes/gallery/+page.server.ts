import { imgUrl } from "$lib/pds";
import type { PageServerLoad } from "./$types";

interface EmojiRef {
  uri: string;
  cid: string;
  name: string;
  alt?: string;
  adultOnly?: boolean;
  formats?: Record<string, unknown>;
}

interface TrendingGroup {
  emoji: EmojiRef;
  count: number;
}

export const load: PageServerLoad = async ({ fetch, url }) => {
  const period = url.searchParams.get("period") ?? "week";
  const res = await fetch(
    `/xrpc/blue.moji.feed.getTrending?period=${encodeURIComponent(period)}&limit=48`,
  );
  if (!res.ok) return { period, items: [] };

  const { items } = (await res.json()) as { period: string; items: TrendingGroup[] };

  const hydrated = items.map((item) => {
    const did = item.emoji.uri.match(/^at:\/\/(did:[^/]+)\//)?.[1];
    const formats = item.emoji.formats ?? {};
    const imageUrl = did
      ? (imgUrl(did, formats.png_128) ??
        imgUrl(did, formats.webp_128) ??
        imgUrl(did, formats.gif_128))
      : null;
    return { ...item, imageUrl };
  });

  return { period, items: hydrated };
};
