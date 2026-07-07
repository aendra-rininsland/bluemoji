import { error } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { resolvePds, blobUrl } from "$lib/pds";
import type { PageServerLoad } from "./$types";

interface ItemView {
  uri?: string;
  did?: string;
  name: string;
  alt?: string;
  createdAt?: string;
  formats?: Record<string, unknown>;
  stickerFormats?: Record<string, unknown>;
  adultOnly?: boolean;
}

interface PackItemView {
  uri: string;
  subject: ItemView;
}

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
  const viewer = await parseViewer(cookies);
  const { handle, rkey } = params;

  let did = handle;
  if (!did.startsWith("did:")) {
    const res = await fetch(
      `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    );
    if (!res.ok) error(404, `Could not resolve handle: ${handle}`);
    did = ((await res.json()) as { did: string }).did;
  }

  const packUri = `at://${did}/blue.moji.packs.pack/${rkey}`;
  const res = await fetch(
    `/xrpc/blue.moji.packs.getPack?pack=${encodeURIComponent(packUri)}&limit=100`,
  );
  if (!res.ok) error(res.status === 404 ? 404 : 502, "Pack not found");

  const { pack, items } = (await res.json()) as { pack: any; items: PackItemView[] };

  // Resolve blob URLs per item owner (items in a pack can live in different repos).
  const ownerDids = [...new Set(items.map((i) => i.subject.did).filter(Boolean))] as string[];
  const pdsMap = new Map<string, string>();
  await Promise.all(
    ownerDids.map(async (ownerDid) => {
      const pds = await resolvePds(ownerDid, fetch).catch(() => null);
      if (pds) pdsMap.set(ownerDid, pds);
    }),
  );

  const hydrated = items.map((item) => {
    const { subject } = item;
    const pds = subject.did ? pdsMap.get(subject.did) : undefined;
    const formats = subject.formats ?? {};
    const imageUrl =
      pds && subject.did
        ? (blobUrl(pds, subject.did, formats.png_128) ??
          blobUrl(pds, subject.did, formats.webp_128) ??
          blobUrl(pds, subject.did, formats.gif_128))
        : null;
    const animatedUrl = pds && subject.did ? blobUrl(pds, subject.did, formats.apng_128) : null;
    return { ...item, imageUrl, animatedUrl };
  });

  const isOwner = viewer?.did === pack.creator?.did;

  // Owners get their collection so they can add items to the pack.
  let collection: { uri: string; name: string; imageUrl: string | null }[] = [];
  if (isOwner && viewer) {
    const pds = await resolvePds(viewer.did, fetch).catch(() => null);
    if (pds) {
      const url = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
      url.searchParams.set("repo", viewer.did);
      url.searchParams.set("collection", "blue.moji.collection.item");
      url.searchParams.set("limit", "100");
      const colRes = await fetch(url);
      if (colRes.ok) {
        const { records } = (await colRes.json()) as { records: any[] };
        collection = (records ?? []).map((r) => ({
          uri: r.uri as string,
          name: (r.value?.name as string) ?? "",
          imageUrl:
            blobUrl(pds, viewer.did, r.value?.formats?.png_128) ??
            blobUrl(pds, viewer.did, r.value?.formats?.webp_128),
        }));
      }
    }
  }

  return { viewer, pack, items: hydrated, isOwner, packUri, collection };
};
