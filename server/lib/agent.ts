// import { setGlobalDispatcher, Agent } from "undici";
// setGlobalDispatcher(new Agent({ connect: { timeout: 20_000 } }));

import { AtpAgent } from "@atproto/api";

export const agent = new AtpAgent({ service: "https://bsky.social" });

export const login = () =>
  agent.login({
    identifier: process.env.BSKY_HANDLE!,
    password: process.env.BSKY_PASSWORD!
  });

export const isLoggedIn = login()
  .then(() => true)
  .catch(() => false);