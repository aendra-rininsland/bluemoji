import { fail, redirect } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { aliasToRkey } from "$lib/alias";
import { resolvePds } from "$lib/pds";
import {
  MastodonError,
  beginAuth,
  clearSession,
  getSession,
  listEmojis,
  parseInstanceDomain,
  publicOrigin,
  revokeToken,
  setPending,
} from "$lib/server/mastodon";
import type { Actions, PageServerLoad } from "./$types";

/** rkeys already in the viewer's collection, so the importer can flag duplicates. */
async function existingRkeys(did: string, fetch: typeof globalThis.fetch): Promise<Set<string>> {
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

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
  const viewer = await parseViewer(cookies);
  if (!viewer) redirect(302, "/");

  const flash = url.searchParams.get("error");
  const session = getSession(cookies);
  if (!session) return { viewer, mastodon: null, emojis: [], packs: [], error: flash };

  let emojis;
  try {
    emojis = await listEmojis(session);
  } catch (e) {
    if (e instanceof MastodonError && e.status === 401) clearSession(cookies);
    const message = e instanceof MastodonError ? e.message : "Could not load emoji";
    return { viewer, mastodon: null, emojis: [], packs: [], error: flash ?? message };
  }

  const [existing, packsRes] = await Promise.all([
    existingRkeys(viewer.did, fetch),
    fetch(`/xrpc/blue.moji.packs.getActorPacks?actor=${encodeURIComponent(viewer.did)}`).catch(
      () => null,
    ),
  ]);
  const packs: { uri: string; name: string }[] = packsRes?.ok
    ? (((await packsRes.json()) as { packs?: { uri: string; name: string }[] }).packs ?? [])
    : [];

  const seen = new Set<string>();
  const rows = emojis.map((e) => {
    let rkey: string | null = null;
    let problem: string | null = null;
    try {
      rkey = aliasToRkey(e.shortcode);
      // Mastodon shortcodes are case-sensitive; Bluemoji aliases are not.
      if (seen.has(rkey)) problem = "Duplicate name once lower-cased";
      seen.add(rkey);
    } catch (err) {
      problem = err instanceof Error ? err.message : "Invalid name";
    }
    return {
      shortcode: e.shortcode,
      category: e.category ?? "",
      animated: e.url !== e.static_url,
      visible: e.visible_in_picker,
      exists: rkey ? existing.has(rkey) : false,
      problem,
    };
  });

  return {
    viewer,
    mastodon: { domain: session.domain, acct: session.acct, displayName: session.displayName },
    emojis: rows,
    packs: packs.map((p) => ({ uri: p.uri, name: p.name })),
    error: flash,
  };
};

export const actions: Actions = {
  connect: async ({ request, cookies, url }) => {
    if (!(await parseViewer(cookies))) redirect(302, "/");
    const data = await request.formData();
    const input = String(data.get("domain") ?? "");
    let authorizeUrl: string;
    try {
      const domain = parseInstanceDomain(input);
      const origin = publicOrigin(url.origin);
      const begun = await beginAuth(domain, `${origin}/import/mastodon/callback`, origin);
      setPending(cookies, begun.pending);
      authorizeUrl = begun.authorizeUrl;
    } catch (e) {
      return fail(400, {
        domain: input,
        error: e instanceof MastodonError ? e.message : "Could not start the Mastodon login",
      });
    }
    redirect(303, authorizeUrl);
  },

  disconnect: async ({ cookies }) => {
    const session = getSession(cookies);
    if (session) await revokeToken(session);
    clearSession(cookies);
    redirect(303, "/import/mastodon");
  },
};
