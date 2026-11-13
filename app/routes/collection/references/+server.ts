import { error, json } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { resolvePds } from "$lib/pds";
import { pdsGet } from "$lib/server/pds-get";
import type { RequestHandler } from "./$types";

// Which of the viewer's own pack entries (blue.moji.packs.packitem) point at
// one of their emoji. Used before deleting an emoji, so its entries can be
// removed with it instead of being left dangling in their packs.
const RKEY_RE = /^[A-Za-z0-9._:~-]{1,512}$/;
const MAX_PAGES = 20;

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
  const viewer = await parseViewer(cookies);
  if (!viewer) error(401, "Authentication required");

  const rkey = url.searchParams.get("rkey") ?? "";
  if (!RKEY_RE.test(rkey) || rkey === "." || rkey === "..") error(400, "Invalid rkey");
  const subject = `at://${viewer.did}/blue.moji.collection.item/${rkey}`;

  const pds = await resolvePds(viewer.did, fetch).catch(() => null);
  if (!pds) error(502, "Could not resolve your PDS");

  const packItems: string[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const u = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
    u.searchParams.set("repo", viewer.did);
    u.searchParams.set("collection", "blue.moji.packs.packitem");
    u.searchParams.set("limit", "100");
    if (cursor) u.searchParams.set("cursor", cursor);
    const res = await pdsGet(u);
    if (!res?.ok) error(502, "Could not check your packs");
    const body = await res.json<{
      records?: { uri: string; value?: { subject?: string } }[];
      cursor?: string;
    }>();
    for (const r of body.records ?? []) {
      if (r.value?.subject === subject) packItems.push(r.uri.split("/").pop()!);
    }
    cursor = body.cursor;
    if (!cursor || !body.records?.length) break;
  }
  // If the repo has more packitems than we scanned, say so rather than claim a clean sweep
  return json({ packItems, complete: !cursor }, { headers: { "cache-control": "no-store" } });
};
