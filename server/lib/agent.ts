// import { setGlobalDispatcher, Agent } from "undici";
// setGlobalDispatcher(new Agent({ connect: { timeout: 20_000 } }));

import { BluemojiAgent } from "@aendra/bluemoji";

export const agent = new BluemojiAgent({ service: "https://bsky.social" });

export const login = () =>
  agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!
  });

export const isLoggedIn = login()
  .then(() => true)
  .catch(() => false);
