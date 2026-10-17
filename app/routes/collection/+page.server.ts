import { redirect } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { resolvePds, imgUrl, animatedImgUrl } from "$lib/pds";
import type { PageServerLoad } from "./$types";

const MAX_PAGES = 20; // 2,000 emoji

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const viewer = await parseViewer(cookies);
  if (!viewer) redirect(302, "/");

  const { did } = viewer;
  const pds = await resolvePds(did, fetch);

  // Page through the whole collection (imports can add hundreds), capped so a
  // runaway repo can't hang the page.
  const records: any[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
    url.searchParams.set("repo", did);
    url.searchParams.set("collection", "blue.moji.collection.item");
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url);
    if (!res.ok) {
      if (page === 0) return { items: [], truncated: false };
      break;
    }
    const body = (await res.json()) as { records?: any[]; cursor?: string };
    records.push(...(body.records ?? []));
    cursor = body.cursor;
    if (!cursor || !body.records?.length) break;
  }
  const truncated = !!cursor;

  const items = records.map((r: any) => {
    const v = r.value;
    const formats = v?.formats;
    // png_128 is a BlobRef in both formats_v0 and formats_v1
    const imageUrl = imgUrl(did, formats?.png_128) ?? imgUrl(did, formats?.webp_128) ?? null;
    // apng_128 is only a BlobRef in formats_v1; in v0 it's raw bytes
    const animatedUrl = animatedImgUrl(did, formats);
    const lottieUrl = imgUrl(did, formats?.lottie);

    return {
      uri: r.uri as string,
      rkey: (r.uri as string).split("/").pop()!,
      name: (v?.name as string) ?? "",
      alt: (v?.alt as string) ?? "",
      license: typeof v?.license === "string" ? v.license : "",
      source: typeof v?.source === "string" ? v.source : "",
      adultOnly: Boolean(v?.adultOnly),
      createdAt: (v?.createdAt as string) ?? "",
      imageUrl,
      animatedUrl,
      lottieUrl,
    };
  });

  return { items, truncated };
};
