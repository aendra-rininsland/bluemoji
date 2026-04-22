import { defineHook } from "$hatk";

export default defineHook("on-login", async (ctx) => {
  const { did, ensureRepo } = ctx;

  // Backfill the user's repo and wait for completion
  await ensureRepo(did);
});
