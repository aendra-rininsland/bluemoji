import { error } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { isAdmin } from "../../../server/_admin.ts";
import type { PageServerLoad } from "./$types";

interface WireLabel {
  uri: string;
  val: string;
  neg?: boolean;
  cts: string;
  exp?: string;
}

// Administrators only. Anyone else gets a plain 404, as if the page didn't exist.
export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
  const viewer = await parseViewer(cookies);
  if (!isAdmin(viewer?.did)) error(404, "Not found");

  // Every current label this AppView has published (emoji and accounts)
  const res = await fetch(
    `/xrpc/com.atproto.label.queryLabels?uriPatterns=${encodeURIComponent("at://*,did:*")}&limit=250`,
  ).catch(() => null);
  const labelerEnabled = res?.ok === true;
  const labels: WireLabel[] = labelerEnabled
    ? ((await res!.json()) as { labels: WireLabel[] }).labels.map((l) => ({
        uri: l.uri,
        val: l.val,
        neg: l.neg === true,
        cts: l.cts,
        exp: l.exp,
      }))
    : [];

  return { labelerEnabled, labels: labels.reverse(), prefill: url.searchParams.get("uri") ?? "" };
};
