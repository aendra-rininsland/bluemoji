import { redirect } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { existingRkeys, viewerPacks } from "$lib/server/collection";
import type { PageServerLoad } from "./$types";

// The zip itself is read entirely in the browser; the server only supplies
// what the page needs to flag duplicates and offer packs.
export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const viewer = await parseViewer(cookies);
  if (!viewer) redirect(302, "/");

  const [existing, packs] = await Promise.all([
    existingRkeys(viewer.did, fetch),
    viewerPacks(viewer.did, fetch),
  ]);
  return { viewer, existing: [...existing], packs };
};
