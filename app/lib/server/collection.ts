// Server-side lookups shared by the importers: what the viewer already has
// (to flag duplicates) and which packs they could add to.
import { resolvePds } from "../pds";

/** rkeys already in the viewer's collection. Best-effort: empty on any failure. */
export async function existingRkeys(
  did: string,
  fetch: typeof globalThis.fetch,
): Promise<Set<string>> {
  const rkeys = new Set<string>();
  try {
    const pds = await resolvePds(did, fetch);
    let cursor: string | undefined;
    for (let page = 0; page < 50; page++) {
      const u = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
      u.searchParams.set("repo", did);
      u.searchParams.set("collection", "blue.moji.collection.item");
      u.searchParams.set("limit", "100");
      if (cursor) u.searchParams.set("cursor", cursor);
      const res = await fetch(u);
      if (!res.ok) break;
      const j = (await res.json()) as { records?: { uri: string }[]; cursor?: string };
      for (const r of j.records ?? []) rkeys.add(r.uri.split("/").pop()!);
      if (!j.cursor || !j.records?.length) break;
      cursor = j.cursor;
    }
  } catch {
    // Duplicate detection is a convenience; import still works without it.
  }
  return rkeys;
}

/** The viewer's own packs (uri + name) for the "add to pack" picker. */
export async function viewerPacks(
  did: string,
  fetch: typeof globalThis.fetch,
): Promise<{ uri: string; name: string }[]> {
  const res = await fetch(
    `/xrpc/blue.moji.packs.getActorPacks?actor=${encodeURIComponent(did)}`,
  ).catch(() => null);
  if (!res?.ok) return [];
  const { packs } = (await res.json()) as { packs?: { uri: string; name: string }[] };
  return (packs ?? []).map((p) => ({ uri: p.uri, name: p.name }));
}
