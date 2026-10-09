import { redirect } from "@sveltejs/kit";
import { parseViewer } from "$hatk/client";
import {
  MastodonError,
  clearPending,
  completeAuth,
  getPending,
  setSession,
} from "$lib/server/mastodon";
import type { RequestHandler } from "./$types";

const back = (msg: string) => redirect(303, `/import/mastodon?error=${encodeURIComponent(msg)}`);

export const GET: RequestHandler = async ({ url, cookies }) => {
  if (!(await parseViewer(cookies))) redirect(302, "/");

  const pending = getPending(cookies);
  clearPending(cookies);
  if (!pending) back("Your Mastodon login expired — please try again");

  const denied = url.searchParams.get("error");
  if (denied) back(denied === "access_denied" ? "Mastodon login was cancelled" : denied);

  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== pending!.state) {
    back("Mastodon login failed (state mismatch)");
  }

  try {
    setSession(cookies, await completeAuth(pending!, code!));
  } catch (e) {
    back(e instanceof MastodonError ? e.message : "Mastodon login failed");
  }
  redirect(303, "/import/mastodon");
};
