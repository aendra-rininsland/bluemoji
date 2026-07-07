import { redirect } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { resolvePds, blobUrl } from "$lib/pds";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const viewer = await parseViewer(cookies);
  if (!viewer) redirect(302, "/");

  const { did } = viewer;
  const pds = await resolvePds(did, fetch);

  const url = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
  url.searchParams.set("repo", did);
  url.searchParams.set("collection", "blue.moji.collection.item");
  url.searchParams.set("limit", "100");

  const res = await fetch(url);
  if (!res.ok) return { items: [] };

  const { records } = (await res.json()) as { records: any[] };

  const items = (records ?? []).map((r: any) => {
    const v = r.value;
    const formats = v?.formats;
    // png_128 is a BlobRef in both formats_v0 and formats_v1
    const imageUrl =
      blobUrl(pds, did, formats?.png_128) ?? blobUrl(pds, did, formats?.webp_128) ?? null;
    // apng_128 is only a BlobRef in formats_v1; in v0 it's raw bytes
    const animatedUrl = blobUrl(pds, did, formats?.apng_128);
    const lottieUrl = blobUrl(pds, did, formats?.lottie);

    return {
      uri: r.uri as string,
      rkey: (r.uri as string).split("/").pop()!,
      name: (v?.name as string) ?? "",
      alt: (v?.alt as string) ?? "",
      adultOnly: Boolean(v?.adultOnly),
      createdAt: (v?.createdAt as string) ?? "",
      imageUrl,
      animatedUrl,
      lottieUrl,
    };
  });

  return { items };
};
