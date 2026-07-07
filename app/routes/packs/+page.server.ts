import { redirect } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const viewer = await parseViewer(cookies);
  if (!viewer) redirect(302, "/");

  const url = `/xrpc/blue.moji.packs.getActorPacks?actor=${encodeURIComponent(viewer.did)}`;
  const res = await fetch(url);
  if (!res.ok) return { packs: [] };

  const { packs } = (await res.json()) as { packs: any[] };
  return { packs: packs ?? [] };
};
