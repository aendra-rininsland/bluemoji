import { error, json } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { resolvePds } from "$lib/pds";
import type { RequestHandler } from "./$types";

// The viewer's own item record, fresh from their PDS. The collection page
// edits a record by putting the whole thing back with one field changed, so
// it needs the latest copy (every field, not a trimmed view) at edit time.
const RKEY_RE = /^[A-Za-z0-9._:~-]{1,512}$/;

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
  const viewer = await parseViewer(cookies);
  if (!viewer) error(401, "Authentication required");

  const rkey = url.searchParams.get("rkey") ?? "";
  if (!RKEY_RE.test(rkey) || rkey === "." || rkey === "..") error(400, "Invalid rkey");

  const pds = await resolvePds(viewer.did, fetch).catch(() => null);
  if (!pds) error(502, "Could not resolve your PDS");

  const u = new URL(`${pds}/xrpc/com.atproto.repo.getRecord`);
  u.searchParams.set("repo", viewer.did);
  u.searchParams.set("collection", "blue.moji.collection.item");
  u.searchParams.set("rkey", rkey);
  const res = await fetch(u).catch(() => null);
  if (!res) error(502, "Could not reach your PDS");
  if (res.status === 400 || res.status === 404) error(404, "Emoji not found");
  if (!res.ok) error(502, "Could not load the emoji");

  const { value, cid } = (await res.json()) as { value: Record<string, unknown>; cid?: string };
  return json({ value, cid }, { headers: { "cache-control": "no-store" } });
};
