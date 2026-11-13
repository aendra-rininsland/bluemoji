import { error } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { resolvePds, imgUrl, animatedImgUrl } from "$lib/pds";
import { pdsGet } from "$lib/server/pds-get";
import type { PageServerLoad } from "./$types";

interface ItemView {
  uri?: string;
  cid?: string;
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

  // Blob URLs go through the same-origin /img proxy (edge-cacheable, no
  // per-owner PDS resolution needed even though items can span repos).
  const hydrated = items.map((item) => {
    const { subject } = item;
    const formats = subject.formats ?? {};
    const imageUrl = subject.did
      ? (imgUrl(subject.did, formats.png_128) ??
        imgUrl(subject.did, formats.webp_128) ??
        imgUrl(subject.did, formats.gif_128))
      : null;
    const animatedUrl = subject.did ? animatedImgUrl(subject.did, formats) : null;
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
      const colRes = await pdsGet(url);
      if (colRes?.ok) {
        const { records } = await colRes.json<{ records: any[] }>();
        collection = (records ?? []).map((r) => ({
          uri: r.uri as string,
          name: (r.value?.name as string) ?? "",
          imageUrl:
            imgUrl(viewer.did, r.value?.formats?.png_128) ??
            imgUrl(viewer.did, r.value?.formats?.webp_128),
        }));
      }
    }
  }

  // Owners can edit name/description. A put replaces the whole record, so
  // fetch the raw one (icon blob ref, adultOnly, labels…) to edit in place.
  let packRecord: Record<string, unknown> | null = null;
  if (isOwner && viewer) {
    const pds = await resolvePds(viewer.did, fetch).catch(() => null);
    if (pds) {
      const recUrl = new URL(`${pds}/xrpc/com.atproto.repo.getRecord`);
      recUrl.searchParams.set("repo", viewer.did);
      recUrl.searchParams.set("collection", "blue.moji.packs.pack");
      recUrl.searchParams.set("rkey", rkey);
      const recRes = await pdsGet(recUrl);
      if (recRes?.ok) packRecord = (await recRes.json<{ value: Record<string, unknown> }>()).value;
    }
  }

  // Admins get feature/un-feature controls; everyone else just gets false.
  let viewerIsAdmin = false;
  let featuredUris: string[] = [];
  if (viewer) {
    const featRes = await fetch("/xrpc/blue.moji.featured.getFeatured");
    if (featRes.ok) {
      const feat = (await featRes.json()) as { viewerIsAdmin: boolean; featuredUris?: string[] };
      viewerIsAdmin = feat.viewerIsAdmin;
      featuredUris = feat.featuredUris ?? [];
    }
  }

  return {
    viewer,
    pack,
    items: hydrated,
    isOwner,
    packRecord,
    packUri,
    collection,
    viewerIsAdmin,
    featuredUris,
  };
};
