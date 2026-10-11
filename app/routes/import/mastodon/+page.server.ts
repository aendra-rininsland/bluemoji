import { fail, redirect } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import { aliasToRkey } from "$lib/alias";
import { existingRkeys, viewerPacks } from "$lib/server/collection";
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

  const [existing, packs] = await Promise.all([
    existingRkeys(viewer.did, fetch),
    viewerPacks(viewer.did, fetch),
  ]);

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
    packs,
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
