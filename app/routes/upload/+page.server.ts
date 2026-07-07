import { redirect } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
  const viewer = await parseViewer(cookies);
  if (!viewer) redirect(302, "/");
};
